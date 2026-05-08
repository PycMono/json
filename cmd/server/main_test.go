package main

import (
	"context"
	"errors"
	"testing"
)

type fakeStartupSyncer struct {
	reconcileErr error
	reconcileHit int
	syncAllHit   int
}

func (f *fakeStartupSyncer) Reconcile(ctx context.Context) error {
	f.reconcileHit++
	return f.reconcileErr
}

func (f *fakeStartupSyncer) SyncAll(ctx context.Context) error {
	f.syncAllHit++
	return nil
}

func TestReconcileSMSDataWithSyncer_NoFallbackOnSuccess(t *testing.T) {
	s := &fakeStartupSyncer{}
	reconcileSMSDataWithSyncer(s)

	if s.reconcileHit != 1 {
		t.Fatalf("expected reconcile once, got %d", s.reconcileHit)
	}
	if s.syncAllHit != 0 {
		t.Fatalf("expected no syncAll call, got %d", s.syncAllHit)
	}
}

func TestReconcileSMSDataWithSyncer_FallbackOnReconcileError(t *testing.T) {
	s := &fakeStartupSyncer{reconcileErr: errors.New("boom")}
	reconcileSMSDataWithSyncer(s)

	if s.reconcileHit != 1 {
		t.Fatalf("expected reconcile once, got %d", s.reconcileHit)
	}
	if s.syncAllHit != 1 {
		t.Fatalf("expected syncAll once, got %d", s.syncAllHit)
	}
}
