package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/cms-backend/internal/database"
	"github.com/google/uuid"
)

// ─── POST /v1/users ──────────────────────────────────────────────────────────
// Business Rule: Hanya Manajer yang bisa menambahkan user
func (apiCfg *apiConfig) handlerCreateUser(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	if role != "Manajer" {
		respondWithError(w, http.StatusForbidden, "Hanya Manajer yang dapat menambahkan user")
		return
	}

	type parameters struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	if err := decoder.Decode(&params); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate role value
	if params.Role != "Manajer" && params.Role != "Kreator" {
		respondWithError(w, http.StatusBadRequest, "Role harus Manajer atau Kreator")
		return
	}

	if params.Name == "" || params.Email == "" {
		respondWithError(w, http.StatusBadRequest, "name dan email wajib diisi")
		return
	}

	user, err := apiCfg.DB.CreateUser(r.Context(), database.CreateUserParams{
		ID:        uuid.New(),
		Name:      params.Name,
		Email:     params.Email,
		Role:      params.Role,
		Status:    "Active",
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	})
	if err != nil {
		log.Println("Error creating user:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	respondWithJSON(w, http.StatusCreated, user)
}

// ─── GET /v1/users ───────────────────────────────────────────────────────────
// Semua role bisa melihat daftar user (untuk memilih PIC dll)
func (apiCfg *apiConfig) handlerGetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := apiCfg.DB.GetUsers(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get users")
		return
	}
	respondWithJSON(w, http.StatusOK, users)
}

// ─── PUT /v1/users/status?id= ────────────────────────────────────────────────
// Business Rule: Hanya Manajer yang bisa mengubah status user
func (apiCfg *apiConfig) handlerUpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	role := getRoleFromHeader(r)
	if role != "Manajer" {
		respondWithError(w, http.StatusForbidden, "Hanya Manajer yang dapat mengubah status user")
		return
	}

	userIDStr := r.URL.Query().Get("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid user ID")
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

	if params.Status != "Active" && params.Status != "Offline" {
		respondWithError(w, http.StatusBadRequest, "Status harus Active atau Offline")
		return
	}

	user, err := apiCfg.DB.UpdateUserStatus(r.Context(), database.UpdateUserStatusParams{
		ID:     userID,
		Status: params.Status,
	})
	if err != nil {
		log.Println("Error updating user status:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to update user status")
		return
	}

	respondWithJSON(w, http.StatusOK, user)
}
