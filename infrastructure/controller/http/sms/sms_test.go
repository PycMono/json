package sms

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSMSRebuyNumber_UsesOrderIDParam(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/sms/order/:orderId/rebuy", SMSRebuyNumber)

	req := httptest.NewRequest(http.MethodPost, "/api/sms/order/ORD-123/rebuy", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}

	if got := resp["old_order_id"]; got != "ORD-123" {
		t.Fatalf("expected old_order_id ORD-123, got %#v", got)
	}
}
