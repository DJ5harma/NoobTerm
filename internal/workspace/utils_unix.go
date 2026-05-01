//go:build !windows
package workspace

import (
	"os/exec"
)

func hideWindow(cmd *exec.Cmd) {
	// No-op on non-windows
}
