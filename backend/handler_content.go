package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/cms-backend/internal/database"
	"github.com/google/uuid"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func getRoleFromHeader(r *http.Request) string {
	return r.Header.Get("X-User-Role")
}

func getUserIDFromHeader(r *http.Request) string {
	return r.Header.Get("X-User-ID")
}

type ContentResponse struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	Category   string    `json:"category"`
	Content    string    `json:"content"`
	AuthorID   uuid.UUID `json:"author_id"`
	AuthorName string    `json:"author_name"`
	Status     string    `json:"status"`
	Feedback   string    `json:"feedback"`
	PlanDate   string    `json:"plan_date"` // tanggal plan (kosong jika belum ada)
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func contentRowToResponse(c database.GetContentsRow) ContentResponse {
	feedback := ""
	if c.Feedback.Valid {
		feedback = c.Feedback.String
	}
	planDate := ""
	if c.PlanDate.Valid {
		planDate = c.PlanDate.Time.Format("2006-01-02")
	}
	return ContentResponse{
		ID:         c.ID,
		Title:      c.Title,
		Category:   c.Category,
		Content:    c.Content,
		AuthorID:   c.AuthorID,
		AuthorName: c.AuthorName,
		Status:     c.Status,
		Feedback:   feedback,
		PlanDate:   planDate,
		CreatedAt:  c.CreatedAt,
		UpdatedAt:  c.UpdatedAt,
	}
}

// ─── GET /v1/contents ────────────────────────────────────────────────────────
// Manajer: lihat semua konten (kecuali Draft)
// Kreator: lihat hanya miliknya sendiri
func (apiCfg *apiConfig) handlerGetContents(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	userID := getUserIDFromHeader(r)

	contents, err := apiCfg.DB.GetContents(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get contents")
		return
	}

	var response []ContentResponse
	for _, c := range contents {
		if role == "Manajer" {
			// Manajer hanya melihat konten yang sudah disubmit (bukan Draft)
			if c.Status != "Draft" {
				response = append(response, contentRowToResponse(c))
			}
		} else {
			// Kreator hanya melihat miliknya sendiri
			if c.AuthorID.String() == userID {
				response = append(response, contentRowToResponse(c))
			}
		}
	}

	if response == nil {
		response = []ContentResponse{}
	}
	respondWithJSON(w, http.StatusOK, response)
}

// ─── GET /v1/plans/available ─────────────────────────────────────────────────
// Kreator: dapatkan daftar plan yang tersedia (belum punya konten & status Planned)
// Dipakai saat Creator ingin pilih plan sebelum submit
func (apiCfg *apiConfig) handlerGetAvailablePlans(w http.ResponseWriter, r *http.Request) {
	plans, err := apiCfg.DB.GetAvailablePlans(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get available plans")
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

// ─── POST /v1/contents ───────────────────────────────────────────────────────
// Business Rule: Hanya Kreator yang bisa membuat konten
func (apiCfg *apiConfig) handlerCreateContent(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	if role != "Kreator" {
		respondWithError(w, http.StatusForbidden, "Hanya Kreator yang dapat membuat konten")
		return
	}

	type parameters struct {
		Title    string `json:"title"`
		Category string `json:"category"`
		Content  string `json:"content"`
		AuthorID string `json:"author_id"`
	}

	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	if err := decoder.Decode(&params); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if params.Title == "" || params.Category == "" || params.Content == "" {
		respondWithError(w, http.StatusBadRequest, "title, category, dan content wajib diisi")
		return
	}

	authorUUID, err := uuid.Parse(params.AuthorID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Author ID")
		return
	}

	content, err := apiCfg.DB.CreateContent(r.Context(), database.CreateContentParams{
		ID:       uuid.New(),
		Title:    params.Title,
		Category: params.Category,
		Content:  params.Content,
		Feedback: sql.NullString{},
		AuthorID: authorUUID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create content")
		return
	}

	feedback := ""
	if content.Feedback.Valid {
		feedback = content.Feedback.String
	}
	respondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"id":         content.ID,
		"title":      content.Title,
		"category":   content.Category,
		"content":    content.Content,
		"author_id":  content.AuthorID,
		"status":     content.Status,
		"feedback":   feedback,
		"created_at": content.CreatedAt,
		"updated_at": content.UpdatedAt,
	})
}

// ─── PUT /v1/contents/edit?id= ───────────────────────────────────────────────
// Business Rule: Kreator edit miliknya sendiri (Draft/Revision), Manajer bisa edit semua
func (apiCfg *apiConfig) handlerUpdateContent(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	userID := getUserIDFromHeader(r)

	contentIDStr := r.URL.Query().Get("id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid content ID")
		return
	}

	existing, err := apiCfg.DB.GetContentByID(r.Context(), contentID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Content tidak ditemukan")
		return
	}

	if role == "Kreator" {
		if existing.AuthorID.String() != userID {
			respondWithError(w, http.StatusForbidden, "Anda tidak bisa mengedit konten milik orang lain")
			return
		}
		if existing.Status != "Draft" && existing.Status != "Revision" {
			respondWithError(w, http.StatusForbidden, "Konten hanya bisa diedit ketika berstatus Draft atau Revision")
			return
		}
	}

	type parameters struct {
		Title    string `json:"title"`
		Category string `json:"category"`
		Content  string `json:"content"`
	}
	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	if err := decoder.Decode(&params); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	content, err := apiCfg.DB.UpdateContent(r.Context(), database.UpdateContentParams{
		ID:       contentID,
		Title:    params.Title,
		Category: params.Category,
		Content:  params.Content,
	})
	if err != nil {
		log.Println("Error updating content:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to update content")
		return
	}

	feedback := ""
	if content.Feedback.Valid {
		feedback = content.Feedback.String
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":         content.ID,
		"title":      content.Title,
		"category":   content.Category,
		"content":    content.Content,
		"author_id":  content.AuthorID,
		"status":     content.Status,
		"feedback":   feedback,
		"updated_at": content.UpdatedAt,
	})
}

// ─── PUT /v1/contents/submit?id= ─────────────────────────────────────────────
// Business Rule: Kreator submit Draft/Revision ke Review
// WAJIB: pilih plan_date (tanggal plan yang mana konten ini akan diisi)
// Efek: content.status → Review, plan.status → Review, plan.content_id → content.id
func (apiCfg *apiConfig) handlerSubmitToReview(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	userID := getUserIDFromHeader(r)

	if role != "Kreator" {
		respondWithError(w, http.StatusForbidden, "Hanya Kreator yang dapat mengajukan konten ke review")
		return
	}

	contentIDStr := r.URL.Query().Get("id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid content ID")
		return
	}

	// Body: plan_date wajib
	type parameters struct {
		PlanDate string `json:"plan_date"` // YYYY-MM-DD, wajib
	}
	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	if err := decoder.Decode(&params); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if params.PlanDate == "" {
		respondWithError(w, http.StatusBadRequest, "plan_date wajib diisi untuk menentukan jadwal konten ini")
		return
	}

	planDate, err := time.Parse("2006-01-02", params.PlanDate)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Format plan_date harus YYYY-MM-DD")
		return
	}

	// Validasi konten
	existing, err := apiCfg.DB.GetContentByID(r.Context(), contentID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Content tidak ditemukan")
		return
	}
	if existing.AuthorID.String() != userID {
		respondWithError(w, http.StatusForbidden, "Anda tidak bisa mengajukan konten milik orang lain")
		return
	}
	if existing.Status != "Draft" && existing.Status != "Revision" {
		respondWithError(w, http.StatusBadRequest, "Hanya konten berstatus Draft atau Revision yang bisa diajukan ke Review")
		return
	}

	// Validasi plan: plan harus ada, statusnya Planned, belum punya content_id
	planObj, err := apiCfg.DB.GetPlanByDate(r.Context(), planDate)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Jadwal plan untuk tanggal tersebut tidak ditemukan. Minta Manajer untuk membuat jadwal terlebih dahulu.")
		return
	}
	if planObj.Status != "Planned" && planObj.Status != "Revision" {
		// Juga izinkan plan yang sudah di-set Planned kembali akibat Revision
		respondWithError(w, http.StatusConflict, "Jadwal plan pada tanggal ini sudah terisi atau sedang direview")
		return
	}
	if planObj.ContentID.Valid {
		// Izinkan re-submit jika konten yang terhubung adalah milik kreator ini (kasus Revision)
		if planObj.ContentID.UUID != contentID {
			respondWithError(w, http.StatusConflict, "Jadwal plan pada tanggal ini sudah diisi oleh konten lain")
			return
		}
	}

	// 1. Update status konten → Review
	content, err := apiCfg.DB.UpdateContentStatus(r.Context(), database.UpdateContentStatusParams{
		ID:     contentID,
		Status: "Review",
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Gagal mengubah status konten")
		return
	}

	// 2. Link content ke plan DAN ubah status plan → Review
	_, err = apiCfg.DB.AssignContentAndSetReview(r.Context(), database.AssignContentAndSetReviewParams{
		PlanDate:  planDate,
		ContentID: uuid.NullUUID{UUID: contentID, Valid: true},
	})
	if err != nil {
		log.Println("Error assigning content to plan:", err)
		// Rollback konten status (best-effort)
		_, _ = apiCfg.DB.UpdateContentStatus(r.Context(), database.UpdateContentStatusParams{
			ID:     contentID,
			Status: existing.Status,
		})
		respondWithError(w, http.StatusInternalServerError, "Gagal menautkan konten ke jadwal plan")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":        content.ID,
		"status":    content.Status,
		"plan_date": params.PlanDate,
		"message":   "Konten berhasil dikirim ke review dan ditautkan ke jadwal " + params.PlanDate,
	})
}

// ─── PUT /v1/contents/review?id= ─────────────────────────────────────────────
// Business Rule: Hanya Manajer yang bisa approve (Approved) atau minta revisi (Revision)
// Jika status Revision, feedback WAJIB diisi
// Efek Approved: plan.status → Completed
// Efek Revision: plan.status → Planned (dikembalikan agar bisa di-submit ulang)
func (apiCfg *apiConfig) handlerReviewContent(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	if role != "Manajer" {
		respondWithError(w, http.StatusForbidden, "Hanya Manajer yang dapat mereview konten")
		return
	}

	contentIDStr := r.URL.Query().Get("id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid content ID")
		return
	}

	type parameters struct {
		Status   string `json:"status"`
		Feedback string `json:"feedback"`
	}
	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	if err := decoder.Decode(&params); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if params.Status != "Approved" && params.Status != "Revision" {
		respondWithError(w, http.StatusBadRequest, "Status review harus Approved atau Revision")
		return
	}

	// Business Rule: feedback wajib jika Revision
	if params.Status == "Revision" && params.Feedback == "" {
		respondWithError(w, http.StatusBadRequest, "Feedback wajib diisi ketika memberikan Revision")
		return
	}

	// Pastikan konten sedang dalam status Review
	existing, err := apiCfg.DB.GetContentByID(r.Context(), contentID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Content tidak ditemukan")
		return
	}
	if existing.Status != "Review" {
		respondWithError(w, http.StatusBadRequest, "Hanya konten berstatus Review yang bisa di-review")
		return
	}

	// 1. Update status konten
	content, err := apiCfg.DB.ReviewContent(r.Context(), database.ReviewContentParams{
		ID:     contentID,
		Status: params.Status,
		Feedback: sql.NullString{
			String: params.Feedback,
			Valid:  params.Feedback != "",
		},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to review content")
		return
	}

	// 2. Update status plan yang terhubung dengan konten ini
	//    Approved → plan Completed | Revision → plan kembali ke Planned
	var planStatus string
	if params.Status == "Approved" {
		planStatus = "Completed"
	} else {
		planStatus = "Planned" // Revision: plan dikembalikan agar bisa re-submit
	}

	_, planErr := apiCfg.DB.UpdatePlanStatusByContentID(r.Context(), database.UpdatePlanStatusByContentIDParams{
		ContentID: uuid.NullUUID{UUID: contentID, Valid: true},
		Status:    planStatus,
	})
	if planErr != nil {
		// Log saja, tidak gagalkan response karena konten sudah berhasil di-review
		log.Println("Warning: gagal update status plan:", planErr)
	}

	feedback := ""
	if content.Feedback.Valid {
		feedback = content.Feedback.String
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":          content.ID,
		"status":      content.Status,
		"feedback":    feedback,
		"plan_status": planStatus,
		"updated_at":  content.UpdatedAt,
	})
}

// ─── DELETE /v1/contents?id= ─────────────────────────────────────────────────
// Business Rule: Kreator hanya bisa hapus Draft miliknya sendiri
func (apiCfg *apiConfig) handlerDeleteContent(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	userID := getUserIDFromHeader(r)

	contentIDStr := r.URL.Query().Get("id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid content ID")
		return
	}

	existing, err := apiCfg.DB.GetContentByID(r.Context(), contentID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Content tidak ditemukan")
		return
	}

	if role == "Kreator" {
		if existing.AuthorID.String() != userID {
			respondWithError(w, http.StatusForbidden, "Anda tidak bisa menghapus konten milik orang lain")
			return
		}
		if existing.Status != "Draft" {
			respondWithError(w, http.StatusForbidden, "Hanya konten Draft yang dapat dihapus oleh Kreator")
			return
		}
	}

	if err := apiCfg.DB.DeleteContent(r.Context(), contentID); err != nil {
		log.Println("Error deleting content:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to delete content")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
