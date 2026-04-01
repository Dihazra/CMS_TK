package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/cms-backend/internal/database"
	"github.com/google/uuid"
)

// ─── PlanResponse ─────────────────────────────────────────────────────────────

type PlanResponse struct {
	ID        uuid.UUID  `json:"id"`
	Pic       string     `json:"pic"`
	Pillar    string     `json:"pillar"`
	ContentID *uuid.UUID `json:"content_id,omitempty"`
	PlanDate  string     `json:"plan_date"` // "YYYY-MM-DD"
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func planToResponse(p database.Plan) PlanResponse {
	resp := PlanResponse{
		ID:        p.ID,
		Pic:       p.Pic,
		Pillar:    p.Pillar,
		PlanDate:  p.PlanDate.Format("2006-01-02"),
		Status:    p.Status,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}
	if p.ContentID.Valid {
		resp.ContentID = &p.ContentID.UUID
	}
	return resp
}

// ─── GET /v1/plans ───────────────────────────────────────────────────────────
// Semua role bisa melihat plan
// Query params: start=YYYY-MM-DD & end=YYYY-MM-DD (optional range filter)
func (apiCfg *apiConfig) handlerGetPlans(w http.ResponseWriter, r *http.Request) {
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr != "" && endStr != "" {
		startDate, err1 := time.Parse("2006-01-02", startStr)
		endDate, err2 := time.Parse("2006-01-02", endStr)
		if err1 != nil || err2 != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid date format, gunakan YYYY-MM-DD")
			return
		}
		plans, err := apiCfg.DB.GetPlansByDateRange(r.Context(), database.GetPlansByDateRangeParams{
			StartDate: startDate,
			EndDate:   endDate,
		})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to get plans")
			return
		}
		var response []PlanResponse
		for _, p := range plans {
			response = append(response, planToResponse(p))
		}
		if response == nil {
			response = []PlanResponse{}
		}
		respondWithJSON(w, http.StatusOK, response)
		return
	}

	plans, err := apiCfg.DB.GetAllPlans(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get plans")
		return
	}
	var response []PlanResponse
	for _, p := range plans {
		response = append(response, planToResponse(p))
	}
	if response == nil {
		response = []PlanResponse{}
	}
	respondWithJSON(w, http.StatusOK, response)
}

// ─── PUT /v1/plans ───────────────────────────────────────────────────────────
// Business Rule: Hanya Manajer yang bisa CRUD plan
// Business Rule: Konten Approved = plan terkunci (tidak bisa ganti content_id)
func (apiCfg *apiConfig) handlerUpsertPlan(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	if role != "Manajer" {
		respondWithError(w, http.StatusForbidden, "Hanya Manajer yang dapat mengelola jadwal planner")
		return
	}

	type parameters struct {
		Pic       string `json:"pic"`
		Pillar    string `json:"pillar"`
		PlanDate  string `json:"plan_date"`
		ContentID string `json:"content_id,omitempty"`
		Status    string `json:"status,omitempty"`
	}

	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	if err := decoder.Decode(&params); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if params.PlanDate == "" {
		respondWithError(w, http.StatusBadRequest, "plan_date wajib diisi")
		return
	}

	planDate, err := time.Parse("2006-01-02", params.PlanDate)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid date format, gunakan YYYY-MM-DD")
		return
	}

	// Default values
	pic := params.Pic
	if pic == "" {
		pic = "-"
	}
	pillar := params.Pillar
	if pillar == "" {
		pillar = "-"
	}
	status := params.Status
	if status == "" {
		status = "Planned"
	}
	// Validate plan status (Planned | Review | Completed)
	validStatuses := map[string]bool{"Planned": true, "Review": true, "Completed": true}
	if !validStatuses[status] {
		respondWithError(w, http.StatusBadRequest, "Status plan harus: Planned, Review, atau Completed")
		return
	}

	// Resolve content_id
	var contentID uuid.NullUUID
	if params.ContentID != "" {
		parsed, err := uuid.Parse(params.ContentID)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid content_id")
			return
		}

		// Business Rule: cek apakah konten sudah Approved di plan ini
		// Jika plan sudah ada, cek content lama
		existingPlan, planErr := apiCfg.DB.GetPlanByDate(r.Context(), planDate)
		if planErr == nil && existingPlan.ContentID.Valid {
			// Plan sudah ada dengan content, cek apakah konten tsb sudah Approved
			existingContent, contentErr := apiCfg.DB.GetContentByID(r.Context(), existingPlan.ContentID.UUID)
			if contentErr == nil && existingContent.Status == "Approved" {
				respondWithError(w, http.StatusConflict,
					"Plan ini sudah terkunci karena kontennya telah disetujui (Approved). Konten tidak bisa diganti.")
				return
			}
		}

		contentID = uuid.NullUUID{UUID: parsed, Valid: true}
	}

	plan, err := apiCfg.DB.UpsertPlan(r.Context(), database.UpsertPlanParams{
		ID:        uuid.New(),
		Pic:       pic,
		Pillar:    pillar,
		ContentID: contentID,
		PlanDate:  planDate,
		Status:    status,
	})
	if err != nil {
		log.Println("Error upserting plan:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to save plan")
		return
	}

	respondWithJSON(w, http.StatusOK, planToResponse(plan))
}

// ─── PUT /v1/plans/status?id= ────────────────────────────────────────────────
// Business Rule: Hanya Manajer yang bisa update status plan
func (apiCfg *apiConfig) handlerUpdatePlanStatus(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	if role != "Manajer" {
		respondWithError(w, http.StatusForbidden, "Hanya Manajer yang dapat mengubah status plan")
		return
	}

	planIDStr := r.URL.Query().Get("id")
	planID, err := uuid.Parse(planIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid plan ID")
		return
	}

	type parameters struct {
		Status string `json:"status"`
	}
	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	if err := decoder.Decode(&params); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	validStatuses := map[string]bool{"Planned": true, "Review": true, "Completed": true}
	if !validStatuses[params.Status] {
		respondWithError(w, http.StatusBadRequest, "Status plan harus: Planned, Review, atau Completed")
		return
	}

	plan, err := apiCfg.DB.UpdatePlanStatus(r.Context(), database.UpdatePlanStatusParams{
		ID:     planID,
		Status: params.Status,
	})
	if err != nil {
		log.Println("Error updating plan status:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to update plan status")
		return
	}

	respondWithJSON(w, http.StatusOK, planToResponse(plan))
}

// ─── DELETE /v1/plans?date=YYYY-MM-DD ────────────────────────────────────────
// Business Rule: Hanya Manajer yang bisa hapus plan
// Business Rule: Plan tidak bisa dihapus jika konten sudah Approved
func (apiCfg *apiConfig) handlerDeletePlan(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	if role != "Manajer" {
		respondWithError(w, http.StatusForbidden, "Hanya Manajer yang dapat menghapus jadwal plan")
		return
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		respondWithError(w, http.StatusBadRequest, "Parameter date diperlukan")
		return
	}

	planDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid date format, gunakan YYYY-MM-DD")
		return
	}

	// Cek apakah konten yang terhubung sudah Approved
	existingPlan, err := apiCfg.DB.GetPlanByDate(r.Context(), planDate)
	if err == nil && existingPlan.ContentID.Valid {
		existingContent, contentErr := apiCfg.DB.GetContentByID(r.Context(), existingPlan.ContentID.UUID)
		if contentErr == nil && existingContent.Status == "Approved" {
			respondWithError(w, http.StatusConflict,
				"Plan tidak bisa dihapus karena konten yang terhubung sudah Approved")
			return
		}
	}

	if err := apiCfg.DB.DeletePlan(r.Context(), planDate); err != nil {
		log.Println("Error deleting plan:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to delete plan")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
