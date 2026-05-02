package system

import (
	"strings"

	"NoobTerm/internal/models"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

func GetOpenPorts() ([]models.PortInfo, error) {
	connections, err := net.Connections("tcp")
	if err != nil {
		return nil, err
	}

	var ports []models.PortInfo
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

			ports = append(ports, models.PortInfo{
				Port:    port,
				Process: procName,
				PID:     conn.Pid,
			})
		}
	}

	return ports, nil
}
