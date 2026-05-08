package repository

import (
	"time"

	"PycMono/github/json/domain/entity"
)

// AIImageRepository combines task and model operations
type AIImageRepository interface {
	// Task operations
	CreateTask(task *entity.AIImageTask) error
	GetTaskByID(taskID string) (*entity.AIImageTask, error)
	UpdateTaskStatus(taskID, status, resultURLs, errMsg string, costSeconds float32) error
	ListHistoryByUser(userID uint, page, pageSize int) ([]entity.AIImageTask, int64, error)
	ListHistoryBySession(sessionKey string, limit int) ([]entity.AIImageTask, error)
	PurgeExpiredPrompts() error
	DeleteExpiredTasks(before time.Time) error

	// Model operations
	ListActiveModels() ([]entity.AIImageModel, error)
	GetModelByID(modelID string) (*entity.AIImageModel, error)
	BatchInsertModels(models []entity.AIImageModel) error
}
