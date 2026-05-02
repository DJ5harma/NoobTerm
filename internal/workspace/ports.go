package workspace

import (
	"strings"

	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

func GetOpenPorts() ([]PortInfo, error) {
	connections, err := net.Connections("tcp")
	if err != nil {
		return nil, err
	}

	var ports []PortInfo
	seen := make(map[int]bool)

	for _, conn := range connections {
		if conn.Status == "LISTEN" && conn.Laddr.Port > 0 {
			port := int(conn.Laddr.Port)
			
			// Avoid duplicates (e.g., IPv4 and IPv6)
			if seen[port] {
				continue
			}
			seen[port] = true

			procName := "Unknown"
			if conn.Pid > 0 {
				if p, err := process.NewProcess(conn.Pid); err == nil {
					if name, err := p.Name(); err == nil {
						procName = name
					}
				}
			}

			// Clean up process name (remove .exe on windows)
			procName = strings.TrimSuffix(procName, ".exe")

			ports = append(ports, PortInfo{
				Port:    port,
				Process: procName,
				PID:     conn.Pid,
			})
		}
	}

	return ports, nil
}
