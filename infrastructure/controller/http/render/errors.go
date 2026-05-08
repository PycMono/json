package render

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// NotFoundPage handles 404 errors
func NotFoundPage(c *gin.Context) {
	t := GetT(c)
	c.Status(http.StatusNotFound)
	data := BaseData(c, gin.H{
		"Title":       t("error.404.title") + " | json",
		"Description": t("error.404.desc"),
		"PageClass":   "page-error",
	})
	Render(c, "404.html", data)
}

// InternalServerErrorPage handles 500 errors
func InternalServerErrorPage(c *gin.Context) {
	t := GetT(c)
	c.Status(http.StatusInternalServerError)
	data := BaseData(c, gin.H{
		"Title":       t("error.500.title") + " | json",
		"Description": t("error.500.desc"),
		"PageClass":   "page-error",
	})
	Render(c, "500.html", data)
}

// RecoveryMiddleware recovers from panics and renders a 500 page
func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				c.Abort()
				InternalServerErrorPage(c)
			}
		}()
		c.Next()
	}
}

// HealthCheck handles /health endpoint
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "toolboxnova",
	})
}
