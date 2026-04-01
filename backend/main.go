package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/cms-backend/internal/database"
)

type apiConfig struct {
	DB *database.Queries
}

func main() {
	godotenv.Load()

	portString := os.Getenv("PORT")
	if portString == "" {
		log.Fatal("PORT is not found in the environment")
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL is not found in the environment")
	}

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
	v1Router.Put("/users/status", apiCfg.handlerUpdateUserStatus)

	// ─── Content Routes ───────────────────────────────────────────────────────
	v1Router.Get("/contents", apiCfg.handlerGetContents)
	v1Router.Post("/contents", apiCfg.handlerCreateContent)           // Kreator only
	v1Router.Put("/contents/submit", apiCfg.handlerSubmitToReview)    // Kreator: Draft→Review
	v1Router.Put("/contents/review", apiCfg.handlerReviewContent)     // Manajer: Review→Approved|Revision
	v1Router.Put("/contents/edit", apiCfg.handlerUpdateContent)       // Kreator (own Draft/Revision) | Manajer
	v1Router.Delete("/contents", apiCfg.handlerDeleteContent)         // Kreator (own Draft) | Manajer

	// ─── Plan Routes (Manajer write, all read) ────────────────────────────────
	v1Router.Get("/plans", apiCfg.handlerGetPlans)
	v1Router.Get("/plans/available", apiCfg.handlerGetAvailablePlans) // Kreator: pilih plan saat submit
	v1Router.Put("/plans", apiCfg.handlerUpsertPlan)                  // Manajer only
	v1Router.Put("/plans/status", apiCfg.handlerUpdatePlanStatus)     // Manajer only
	v1Router.Delete("/plans", apiCfg.handlerDeletePlan)               // Manajer only

	srv := &http.Server{
		Handler: router,
		Addr:    ":" + portString,
	}

	log.Printf("Server starting on port %v", portString)
	err = srv.ListenAndServe()
	if err != nil {
		log.Fatal(err)
	}
}
