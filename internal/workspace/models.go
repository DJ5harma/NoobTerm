package workspace

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	CreatedAt int64     `json:"createdAt"`
	UpdatedAt int64     `json:"updatedAt"`
	Layout    string    `json:"layout"` // JSON string for flexlayout-react
	Commands  []Command `json:"commands"`
}

type Command struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Command   string            `json:"command"`
	Group     string            `json:"group,omitempty"`
	IsGlobal  bool              `json:"isGlobal"`
	IsStartup bool              `json:"isStartup"`
	Variables []CommandVariable `json:"variables,omitempty"`
}

type CommandVariable struct {
	Name    string `json:"name"`
	Default string `json:"default,omitempty"`
}

type Config struct {
	DefaultShell string `json:"defaultShell"`
}

type ShellInfo struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type PortInfo struct {
	Port    int    `json:"port"`
	Process string `json:"process"`
	PID     int32  `json:"pid"`
}
