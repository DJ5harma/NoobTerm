package workspace

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	CreatedAt int64     `json:"createdAt"`
	UpdatedAt int64     `json:"updatedAt"`
	Tabs      []Tab     `json:"tabs"`
	Commands  []Command `json:"commands"`
}

type Tab struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Panes      []Pane     `json:"panes"`
	RootLayout LayoutNode `json:"rootLayout"`
}

type Pane struct {
	ID        string      `json:"id"`
	CWD       string      `json:"cwd"`
	ProcessID int         `json:"processId,omitempty"`
	Layout    *LayoutNode `json:"layout"`
}

type LayoutNode struct {
	Type      string        `json:"type"` // "split" or "pane"
	Direction string        `json:"direction,omitempty"` // "horizontal" or "vertical"
	Children  []*LayoutNode `json:"children,omitempty"`
	PaneID    string        `json:"paneId,omitempty"`
}

type Command struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Command   string            `json:"command"`
	Group     string            `json:"group,omitempty"`
	Variables []CommandVariable `json:"variables,omitempty"`
}

type CommandVariable struct {
	Name    string `json:"name"`
	Default string `json:"default,omitempty"`
}
