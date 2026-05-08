package prompts

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type PromptMgr struct {
	mu        sync.RWMutex
	PromptDir string
	cache     map[string]*Prompt
}

func NewPromptMgr() *PromptMgr {
	return &PromptMgr{
		PromptDir: "./common/prompts",
		cache:     make(map[string]*Prompt),
	}
}

var (
	mgr *PromptMgr
)

func Init() {
	m := NewPromptMgr()
	err := m.load("compete-analyze.md")
	if err != nil {
		panic(err)
	}
	err = m.load("compete-suggest.md")
	if err != nil {
		panic(err)
	}
	err = m.load("detect-ai.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-academic.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-aggressive.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-basic.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-creative.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-standard.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-business.md")
	if err != nil {
		panic(err)
	}
	err = m.load("plagiarism-check.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-essay.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-sentence-rewrite.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-paragraph-rewrite.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-article-rewrite.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-college.md")
	if err != nil {
		panic(err)
	}
	err = m.load("humanize-professor.md")
	if err != nil {
		panic(err)
	}
	err = m.load("detect-academic.md")
	if err != nil {
		panic(err)
	}
	err = m.load("ai-image-enhance.md")
	if err != nil {
		panic(err)
	}
	err = m.load("ai-image-generate.md")
	if err != nil {
		panic(err)
	}

	mgr = m
}

func Get(fileName string) (*Prompt, error) {
	c, ok := mgr.cache[fileName]
	if !ok {
		return nil, fmt.Errorf("未找到对应的提示词,%v", fileName)
	}

	return c, nil
}

func Build(name string, vars map[string]string) (system string, user string, err error) {
	p, e := Get(name)
	if e != nil {
		return "", "", e
	}
	system = p.system
	user = p.user
	for k, v := range vars {
		user = strings.ReplaceAll(user, "{{."+k+"}}", v)
	}
	return system, user, nil
}

func (l *PromptMgr) load(filename string) error {
	path := filepath.Join(l.PromptDir, filename)
	content, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("prompt file '%s' not found: %v", path, err)
	}

	p, err := parsePromptMD(filename, string(content))
	if err != nil {
		return err
	}

	l.cache[filename] = p

	return nil
}

func parsePromptMD(mode, content string) (*Prompt, error) {
	parts := strings.SplitN(content, "\n## Input\n", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("prompt for mode '%s' missing '## Input' section", mode)
	}
	system := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(parts[0]), "# SYSTEM"))
	user := strings.TrimSpace(parts[1])
	return &Prompt{
		mode:     mode,
		system:   system,
		user:     user,
		loadedAt: time.Now(),
	}, nil
}
