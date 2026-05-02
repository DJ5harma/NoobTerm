package workspace

import (
	"sort"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/process"
)

func GetSystemStats() (*SystemStats, error) {
	// 1. CPU Usage
	cpuPercents, err := cpu.Percent(time.Second, false)
	var cpuUsage float64
	if err == nil && len(cpuPercents) > 0 {
		cpuUsage = cpuPercents[0]
	}

	// 2. Memory Usage
	vMem, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	// 3. Top Processes
	procs, err := process.Processes()
	var procInfos []ProcessInfo
	if err == nil {
		for i, p := range procs {
			if i > 100 { // Limit scanning to first 100 for performance, then sort
				break
			}
			name, _ := p.Name()
			cpuP, _ := p.CPUPercent()
			memP, _ := p.MemoryPercent()
			memInfo, _ := p.MemoryInfo()
			var rss uint64
			if memInfo != nil {
				rss = memInfo.RSS
			}
			
			procInfos = append(procInfos, ProcessInfo{
				PID:       p.Pid,
				Name:      strings.TrimSuffix(name, ".exe"),
				CPU:       cpuP,
				Memory:    memP,
				MemoryRSS: rss,
			})
		}
	}

	// Sort by CPU usage descending
	sort.Slice(procInfos, func(i, j int) bool {
		return procInfos[i].CPU > procInfos[j].CPU
	})

	// Take top 10
	if len(procInfos) > 10 {
		procInfos = procInfos[:10]
	}

	return &SystemStats{
		CPUUsage: cpuUsage,
		MemoryUsage: MemoryStats{
			Total:       vMem.Total,
			Used:        vMem.Used,
			UsedPercent: vMem.UsedPercent,
		},
		Processes: procInfos,
	}, nil
}
