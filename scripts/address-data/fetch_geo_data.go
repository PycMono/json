package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	statesURL  = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json"
	nestedURL  = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json"
)

type stateRow struct {
	CountryCode string `json:"country_code"`
	StateCode   string `json:"state_code"`
	Name        string `json:"name"`
}

type nestedCountry struct {
	Iso2   string        `json:"iso2"`
	States []nestedState `json:"states"`
}

type nestedState struct {
	StateCode string       `json:"state_code"`
	Cities    []nestedCity `json:"cities"`
}

type nestedCity struct {
	Name string `json:"name"`
}

type outCity struct {
	Name string `json:"name"`
}

type outState struct {
	Name      string    `json:"name"`
	StateCode string    `json:"state_code"`
	Cities    []outCity `json:"cities"`
}

type outCountry struct {
	Code   string     `json:"code"`
	States []outState `json:"states"`
}

type outFile struct {
	Version   string       `json:"version"`
	Source    []string     `json:"source"`
	Countries []outCountry `json:"countries"`
}

func fetchBytes(url string) ([]byte, error) {
	client := &http.Client{Timeout: 180 * time.Second}
	var lastErr error
	for i := 0; i < 4; i++ {
		resp, err := client.Get(url)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(i+1) * time.Second)
			continue
		}
		body, readErr := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			time.Sleep(time.Duration(i+1) * time.Second)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("fetch failed %s: %s", url, resp.Status)
			time.Sleep(time.Duration(i+1) * time.Second)
			continue
		}
		return body, nil
	}
	return nil, lastErr
}

func dedupeSorted(in []string) []string {
	if len(in) == 0 {
		return in
	}
	sort.Strings(in)
	out := make([]string, 0, len(in))
	for i, s := range in {
		if i == 0 || s != in[i-1] {
			out = append(out, s)
		}
	}
	return out
}

func main() {
	countriesFlag := flag.String("countries", "all", "comma-separated country codes, or 'all'")
	outPath := flag.String("out", "frontend/static/datasets/address/geo.v1.json", "output json path")
	cityLimit := flag.Int("city-limit", 60, "max city count for each state")
	rawDir := flag.String("raw-dir", "frontend/static/datasets/address/raw/v1", "directory to save raw upstream files")
	flag.Parse()

	selected := map[string]bool{}
	useAll := strings.EqualFold(strings.TrimSpace(*countriesFlag), "all")
	if !useAll {
		for _, c := range strings.Split(*countriesFlag, ",") {
			cc := strings.ToUpper(strings.TrimSpace(c))
			if cc != "" {
				selected[cc] = true
			}
		}
		if len(selected) == 0 {
			fmt.Fprintln(os.Stderr, "no countries selected")
			os.Exit(1)
		}
	}

	statesRaw, err := fetchBytes(statesURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "fetch states error: %v\n", err)
		os.Exit(1)
	}
	nestedRaw, err := fetchBytes(nestedURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "fetch nested countries error: %v\n", err)
		os.Exit(1)
	}

	var states []stateRow
	if err := json.Unmarshal(statesRaw, &states); err != nil {
		fmt.Fprintf(os.Stderr, "decode states error: %v\n", err)
		os.Exit(1)
	}
	var nested []nestedCountry
	if err := json.Unmarshal(nestedRaw, &nested); err != nil {
		fmt.Fprintf(os.Stderr, "decode nested countries error: %v\n", err)
		os.Exit(1)
	}

	if err := os.MkdirAll(*rawDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "mkdir raw dir error: %v\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile(filepath.Join(*rawDir, "states.json"), statesRaw, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "write raw states error: %v\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile(filepath.Join(*rawDir, "countries+states+cities.json"), nestedRaw, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "write raw nested error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("saved raw files under: %s\n", *rawDir)

	if useAll {
		for _, s := range states {
			cc := strings.ToUpper(strings.TrimSpace(s.CountryCode))
			if cc != "" {
				selected[cc] = true
			}
		}
	}

	stateMap := map[string][]stateRow{}
	for _, s := range states {
		if selected[strings.ToUpper(s.CountryCode)] {
			stateMap[strings.ToUpper(s.CountryCode)] = append(stateMap[strings.ToUpper(s.CountryCode)], s)
		}
	}

	cityMap := map[string]map[string][]string{}
	for _, n := range nested {
		cc := strings.ToUpper(strings.TrimSpace(n.Iso2))
		if !selected[cc] {
			continue
		}
		if cityMap[cc] == nil {
			cityMap[cc] = map[string][]string{}
		}
		for _, st := range n.States {
			sc := strings.ToUpper(strings.TrimSpace(st.StateCode))
			for _, ct := range st.Cities {
				name := strings.TrimSpace(ct.Name)
				if name != "" {
					cityMap[cc][sc] = append(cityMap[cc][sc], name)
				}
			}
		}
	}

	out := outFile{
		Version: "v1",
		Source: []string{
			statesURL,
			nestedURL,
		},
	}

	for cc := range selected {
		rows := stateMap[cc]
		sort.Slice(rows, func(i, j int) bool {
			return rows[i].Name < rows[j].Name
		})
		country := outCountry{Code: cc}
		for _, s := range rows {
			sc := strings.ToUpper(strings.TrimSpace(s.StateCode))
			cityNames := dedupeSorted(cityMap[cc][sc])
			if len(cityNames) > *cityLimit {
				cityNames = cityNames[:*cityLimit]
			}
			citiesOut := make([]outCity, 0, len(cityNames))
			for _, name := range cityNames {
				citiesOut = append(citiesOut, outCity{Name: name})
			}
			country.States = append(country.States, outState{
				Name:      s.Name,
				StateCode: s.StateCode,
				Cities:    citiesOut,
			})
		}
		out.Countries = append(out.Countries, country)
	}

	sort.Slice(out.Countries, func(i, j int) bool {
		return out.Countries[i].Code < out.Countries[j].Code
	})

	if err := os.MkdirAll(filepath.Dir(*outPath), 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "mkdir error: %v\n", err)
		os.Exit(1)
	}
	f, err := os.Create(*outPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "create file error: %v\n", err)
		os.Exit(1)
	}
	defer func() {
		_ = f.Close()
	}()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		fmt.Fprintf(os.Stderr, "encode error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("saved dataset: %s (countries=%d)\n", *outPath, len(out.Countries))
}

