package ai_image

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
)

// aiImageRepo 实现 repository.AIImageRepository 接口
type aiImageRepo struct {
	db *gorm.DB
}

// NewAIImageRepository 构造函数（在 wire / 主入口注入）
func NewAIImageRepository(db *gorm.DB) repository.AIImageRepository {
	return &aiImageRepo{db: db}
}

// ──────────────────── Task ────────────────────

// CreateTask 创建生成任务记录
func (r *aiImageRepo) CreateTask(task *entity.AIImageTask) error {
	return r.db.Create(task).Error
}

// GetTaskByID 按 task_id (UUID) 查询
func (r *aiImageRepo) GetTaskByID(taskID string) (*entity.AIImageTask, error) {
	var t entity.AIImageTask
	err := r.db.Where("task_id = ?", taskID).First(&t).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &t, err
}

// UpdateTaskStatus 更新任务状态与结果
func (r *aiImageRepo) UpdateTaskStatus(taskID, status, resultURLs, errMsg string, costSeconds float32) error {
	updates := map[string]interface{}{
		"status":       status,
		"result_urls":  resultURLs,
		"error_msg":    errMsg,
		"cost_seconds": costSeconds,
	}
	return r.db.Model(&entity.AIImageTask{}).
		Where("task_id = ?", taskID).
		Updates(updates).Error
}

// ListHistoryByUser 查询用户生成历史（已登录）
func (r *aiImageRepo) ListHistoryByUser(userID uint, page, pageSize int) ([]entity.AIImageTask, int64, error) {
	var tasks []entity.AIImageTask
	var total int64

	base := r.db.Model(&entity.AIImageTask{}).
		Where("user_id = ? AND status = 'success'", userID)

	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := base.Order("created_at DESC").
		Offset(offset).Limit(pageSize).
		Find(&tasks).Error
	return tasks, total, err
}

// ListHistoryBySession 查询游客生成历史（session_key）
func (r *aiImageRepo) ListHistoryBySession(sessionKey string, limit int) ([]entity.AIImageTask, error) {
	var tasks []entity.AIImageTask
	err := r.db.Where("session_key = ? AND status = 'success'", sessionKey).
		Order("created_at DESC").
		Limit(limit).
		Find(&tasks).Error
	return tasks, err
}

// PurgeExpiredPrompts 将过期任务的提示词置空（隐私合规，保留元数据）
func (r *aiImageRepo) PurgeExpiredPrompts() error {
	return r.db.Model(&entity.AIImageTask{}).
		Where("expire_at < ? AND (prompt != '' OR negative_prompt != '')", time.Now()).
		Updates(map[string]interface{}{
			"prompt":          "",
			"negative_prompt": "",
		}).Error
}

// DeleteExpiredTasks 删除超过 30 天的过期任务（可选，定期清理）
func (r *aiImageRepo) DeleteExpiredTasks(before time.Time) error {
	return r.db.Where("expire_at < ?", before).
		Delete(&entity.AIImageTask{}).Error
}

// ──────────────────── Model ────────────────────

// ListActiveModels 获取所有启用的模型，按 sort_order 升序
func (r *aiImageRepo) ListActiveModels() ([]entity.AIImageModel, error) {
	var models []entity.AIImageModel
	err := r.db.Where("is_active = true").
		Order("sort_order ASC, id ASC").
		Find(&models).Error
	return models, err
}

// GetModelByID 按 model_id 查询单个模型
func (r *aiImageRepo) GetModelByID(modelID string) (*entity.AIImageModel, error) {
	var m entity.AIImageModel
	err := r.db.Where("model_id = ?", modelID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &m, err
}

// BatchInsertModels 批量插入模型（冷启动种子数据，忽略已存在）
func (r *aiImageRepo) BatchInsertModels(models []entity.AIImageModel) error {
	return r.db.
		Clauses(clause.OnConflict{DoNothing: true}).
		CreateInBatches(models, 50).Error
}
