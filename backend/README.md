# CMS Backend

Backend system for CMS_TK application, built using Go, Chi Router, PostgreSQL, and SQLC.

## Prerequisites

- [Go](https://go.dev/dl/) 1.21+
- [PostgreSQL](https://www.postgresql.org/download/)
- [sqlc](https://docs.sqlc.dev/en/latest/overview/install.html) (Optional, only for generating queries)
- [migrate](https://github.com/golang-migrate/migrate) (Optional, for database migration if used)

## Setup and Running

1. **Clone the repository:**
   Ensure you're in the `backend` directory.

2. **Configure Environment:**
   Update the `.env` file according to your database credentials:
   ```env
   PORT=8080
   DB_URL=postgres://USERNAME:PASSWORD@localhost:5432/cms_tk?sslmode=disable
   ```
   *Note: Make sure to create a database named `cms_tk` in your local Postgres instance.*

3. **Run Database Schema (Migration):**
   You can either run the SQL manually found in `sql/schema/001_init.sql` against your `cms_tk` database:
   ```bash
   psql -U USERNAME -d cms_tk -f sql/schema/001_init.sql
   ```

4. **Install Dependencies:**
   ```bash
   go mod tidy
   ```

5. **Start the Server:**
   ```bash
   go run .
   ```
   The backend will start running on `http://localhost:8080`.

## Generating SQLC (Optional)
If you update `sql/queries` or `sql/schema`, generate the Go code using:
```bash
go run github.com/sqlc-dev/sqlc/cmd/sqlc@latest generate
```

## API Endpoints

### Users
- `GET /v1/users`: Fetch list of users.
- `POST /v1/users`: Create a new user.
  - Body: `{ "name": "...", "email": "...", "role": "Author" }`

### Contents
- `GET /v1/contents`: Fetch list of contents.
- `POST /v1/contents`: Create new content.
  - Body: `{ "title": "...", "category": "Blog", "content": "...", "author_id": "uuid", "due_date": "YYYY-MM-DD" }`
