package prompts

import "time"

type Prompt struct {
	mode     string
	system   string
	user     string
	loadedAt time.Time
}

func (l *Prompt) GetTpl() string {
	return l.user
}

func (l *Prompt) GetSystem() string {
	return l.system
}
