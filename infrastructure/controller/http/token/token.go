package token

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"PycMono/github/json/application/service/token"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/controller/http/auth"
	"PycMono/github/json/infrastructure/controller/http/render"
)

var tokenSvc *token.TokenService

// SetTokenService 注入 Token 服务
func SetTokenService(svc *token.TokenService) {
	tokenSvc = svc
}

// getUserID 从 context 获取用户 ID（string 格式）
func getUserID(c *gin.Context) (string, bool) {
	uid, ok := auth.GetUserFromContext(c)
	if !ok {
		return "", false
	}
	return strconv.FormatUint(uid, 10), true
}

// TokenDashboardPage GET /user/tokens — Token 额度中心页面
func TokenDashboardPage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("token-mgr.seo.title") + " | Tool Box Nova",
		"Description": t("token-mgr.seo.desc"),
		"PageClass":   "page-token-mgr",
	})
	render.Render(c, "tools/token-mgr.html", data)
}

// GetBalance GET /api/token/balance
func GetBalance(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	bal, err := tokenSvc.GetBalanceVO(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "load_failed"})
		return
	}
	c.JSON(http.StatusOK, bal)
}

// GetHistory GET /api/token/history?page=1&size=20
func GetHistory(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size > 50 {
		size = 50
	}

	list, total, err := tokenSvc.TxRepo().ListByUser(c.Request.Context(), userID, "", page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "load_failed"})
		return
	}
	pages := int64(0)
	if size > 0 {
		pages = (total + int64(size) - 1) / int64(size)
	}
	c.JSON(http.StatusOK, gin.H{
		"list":  list,
		"total": total,
		"page":  page,
		"size":  size,
		"pages": pages,
	})
}

// GetStats GET /api/token/stats?days=30
func GetStats(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days > 90 {
		days = 90
	}

	daily, err := tokenSvc.TxRepo().DailyStats(c.Request.Context(), userID, "", days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "load_failed"})
		return
	}
	breakdown, _ := tokenSvc.TxRepo().ToolBreakdown(c.Request.Context(), userID, "", days)
	c.JSON(http.StatusOK, gin.H{
		"daily":     daily,
		"breakdown": breakdown,
	})
}

// GetRules GET /api/quota/rules — 查询计费规则
func GetRules(c *gin.Context) {
	rules, err := tokenSvc.RuleRepo().ListEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "load_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

// AdminGrantAPI POST /api/token/grant — 管理员发放 Token
func AdminGrantAPI(c *gin.Context) {
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Amount int64  `json:"amount" binding:"required,min=1"`
		Note   string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := tokenSvc.AdminGrant(c.Request.Context(), req.UserID, req.Amount, req.Note); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// AdminRefundAPI POST /api/token/refund — 管理员退款
func AdminRefundAPI(c *gin.Context) {
	var req struct {
		UserID       string `json:"user_id" binding:"required"`
		OriginalTxID uint   `json:"original_tx_id" binding:"required"`
		Amount       int64  `json:"amount" binding:"required,min=1"`
		Reason       string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := tokenSvc.Refund(c.Request.Context(), req.UserID, req.OriginalTxID, req.Amount, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// CheckBalance 供 AI handler 调用 — 检查余额
func CheckBalance(ctx context.Context, userID string, minRequired int64) error {
	if tokenSvc == nil {
		return nil
	}
	return tokenSvc.CheckBalance(ctx, userID, minRequired)
}

// ConsumeForAI 供 AI handler 调用 — 扣减 Token
func ConsumeForAI(ctx context.Context, userID, toolName, modelName string, promptTokens, completionTokens, totalTokens int) {
	if tokenSvc == nil {
		return
	}
	_ = tokenSvc.ConsumeForAI(ctx, userID, toolName, modelName, promptTokens, completionTokens, totalTokens)
}

// IsInsufficientBalance 判断是否为余额不足错误
func IsInsufficientBalance(err error) bool {
	return errors.Is(err, repository.ErrInsufficientBalance)
}
