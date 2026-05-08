package app

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/cms-backend/internal/database"
	"github.com/google/uuid"
)

func (apiCfg *apiConfig) handlerGetAuditLogs(w http.ResponseWriter, r *http.Request) {
	role := r.Header.Get("X-User-Role")
	if role != "Manajer" {
		respondWithError(w, http.StatusForbidden, "Hanya Manajer yang dapat melihat audit trail")
		return
	}

	logs, err := apiCfg.DB.GetAuditLogs(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Couldn't get audit logs")
		return
	}

	// format the output with the username
	type AuditLogResponse struct {
		ID         uuid.UUID `json:"id"`
		UserID     *uuid.UUID `json:"user_id,omitempty"`
		UserName   string    `json:"user_name"`
		Action     string    `json:"action"`
		EntityType string    `json:"entity_type"`
		EntityID   string    `json:"entity_id,omitempty"`
		Details    string    `json:"details,omitempty"`
		CreatedAt  time.Time `json:"created_at"`
	}

	var response []AuditLogResponse
	for _, l := range logs {
		var uid *uuid.UUID
		if l.UserID.Valid {
			uid = &l.UserID.UUID
		}
		uname := "Unknown User"
		if l.UserName.Valid {
			uname = l.UserName.String
		}
		eid := ""
		if l.EntityID.Valid {
			eid = l.EntityID.String
		}
		det := ""
		if l.Details.Valid {
			det = l.Details.String
		}
		response = append(response, AuditLogResponse{
			ID:         l.ID,
			UserID:     uid,
			UserName:   uname,
			Action:     l.Action,
			EntityType: l.EntityType,
			EntityID:   eid,
			Details:    det,
			CreatedAt:  l.CreatedAt,
		})
	}
	if response == nil {
		response = []AuditLogResponse{}
	}

	respondWithJSON(w, http.StatusOK, response)
}

// Helper to log audit trail internally
func (apiCfg *apiConfig) logAudit(r *http.Request, action string, entityType string, entityID string, details string) {
	userIDStr := r.Header.Get("X-User-ID")
	var userID uuid.NullUUID
	if parsedUser, err := uuid.Parse(userIDStr); err == nil {
		userID = uuid.NullUUID{UUID: parsedUser, Valid: true}
	}

	_, err := apiCfg.DB.CreateAuditLog(r.Context(), database.CreateAuditLogParams{
		ID:         uuid.New(),
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   sql.NullString{String: entityID, Valid: entityID != ""},
		Details:    sql.NullString{String: details, Valid: details != ""},
		CreatedAt:  time.Now(),
	})
	if err != nil {
		log.Printf("Failed to create audit log: %v", err)
	}
}

