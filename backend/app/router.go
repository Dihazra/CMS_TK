package app

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/cms-backend/internal/database"
	_ "github.com/lib/pq"
)

type apiConfig struct {
	DB *database.Queries
}

func NewRouter(dbURL string) http.Handler {
	conn, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Can't connect to database:", err)
	}

	db := database.New(conn)
	apiCfg := apiConfig{
		DB: db,
	}

	router := chi.NewRouter()

	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-User-Role", "X-User-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	router.Use(middleware.Logger)

	v1Router := chi.NewRouter()
	router.Mount("/v1", v1Router)

	// ─── User Routes (Manajer only for write) ────────────────────────────────
	v1Router.Get("/users", apiCfg.handlerGetUsers)
	v1Router.Post("/users", apiCfg.handlerCreateUser)
	v1Router.Put("/users", apiCfg.handlerUpdateUser)
	v1Router.Delete("/users", apiCfg.handlerDeleteUser)
	v1Router.Put("/users/status", apiCfg.handlerUpdateUserStatus)

	// ─── Content Routes ───────────────────────────────────────────────────────
	v1Router.Get("/contents", apiCfg.handlerGetContents)
	v1Router.Post("/contents", apiCfg.handlerCreateContent)
	v1Router.Put("/contents/submit", apiCfg.handlerSubmitToReview)
	v1Router.Put("/contents/review", apiCfg.handlerReviewContent)
	v1Router.Put("/contents/edit", apiCfg.handlerUpdateContent)
	v1Router.Delete("/contents", apiCfg.handlerDeleteContent)

	// ─── Plan Routes (Manajer write, all read) ────────────────────────────────
	v1Router.Get("/plans", apiCfg.handlerGetPlans)
	v1Router.Get("/plans/available", apiCfg.handlerGetAvailablePlans)
	v1Router.Put("/plans", apiCfg.handlerUpsertPlan)
	v1Router.Put("/plans/status", apiCfg.handlerUpdatePlanStatus)
	v1Router.Delete("/plans", apiCfg.handlerDeletePlan)

	return router
}
