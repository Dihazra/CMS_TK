package api

import (
	"fmt"
	"net/http"
	"os"

	"github.com/cms-backend/app"
)

var router http.Handler

func init() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		fmt.Println("DB_URL is not found in the environment. Serverless initialization failed.")
		return
	}
	router = app.NewRouter(dbURL)
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if router == nil {
		http.Error(w, "Router failed to initialize. Check DB_URL environment variable.", http.StatusInternalServerError)
		return
	}
	router.ServeHTTP(w, r)
}
