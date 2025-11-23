// Theme switching functionality
const themeSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const modeIndicator = document.querySelector('.mode-indicator');

// Check for saved theme preference or use preferred color scheme
const currentTheme = localStorage.getItem('theme') || 
                   (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeSwitch.checked = true;
    modeIndicator.textContent = 'Dark Mode';
}

themeSwitch.addEventListener('change', function(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        modeIndicator.textContent = 'Dark Mode';
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        modeIndicator.textContent = 'Light Mode';
    }
});

// Process colors for visualization
const processColors = [
    'var(--process-1)', 'var(--process-2)', 'var(--process-3)', 'var(--process-4)', 'var(--process-5)',
    'var(--process-6)', 'var(--process-7)', 'var(--process-8)', 'var(--process-9)', 'var(--process-10)'
];

// Algorithm names mapping
const algorithmNames = {
    'fcfs': 'First Come First Served (FCFS)',
    'sjf': 'Shortest Job First (Non-preemptive)',
    'srtf': 'Shortest Remaining Time First (Preemptive)',
    'rr': 'Round Robin',
    'priority-np': 'Priority (Non-preemptive)',
    'priority-p': 'Priority (Preemptive)'
};

// Global variables
let processes = [];
let lastResult = null;
let simulationInterval = null;
let currentSimulationTime = 0;
let isSimulationPaused = false;
let simulationSpeed = 1000; // 1 second per time unit by default

// DOM elements
const algorithmSelect = document.getElementById('algorithm');
const timeQuantumInput = document.getElementById('timeQuantumInput');
const priorityInput = document.getElementById('priorityInput');
const priorityColumn = document.querySelector('.priority-column');
const processInputBtn = document.getElementById('processInputBtn');
const calculateBtn = document.getElementById('calculateBtn');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const currentAlgorithmDisplay = document.getElementById('currentAlgorithm');
const ganttChart = document.getElementById('ganttChart');
const ganttChartLive = document.getElementById('ganttChartLive');
const currentTimeDisplay = document.getElementById('currentTime');
const resultTable = document.getElementById('resultTable');
const processTableBody = document.getElementById('processTableBody');

// Event listeners
algorithmSelect.addEventListener('change', function() {
    const selectedAlgorithm = this.value;
    
    // Show/hide time quantum input for Round Robin
    if (selectedAlgorithm === 'rr') {
        timeQuantumInput.style.display = 'block';
    } else {
        timeQuantumInput.style.display = 'none';
    }
    
    // Show/hide priority input for Priority algorithms
    if (selectedAlgorithm.includes('priority')) {
        priorityInput.style.display = 'block';
        priorityColumn.style.display = 'table-cell';
    } else {
        priorityInput.style.display = 'none';
        priorityColumn.style.display = 'none';
    }
    
    // Update current algorithm display
    currentAlgorithmDisplay.textContent = algorithmNames[selectedAlgorithm];
});

processInputBtn.addEventListener('click', processInput);
calculateBtn.addEventListener('click', calculateScheduling);
startBtn.addEventListener('click', () => startLiveVisualization(lastResult));
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetSimulation);

// Initialize with FCFS selected
algorithmSelect.dispatchEvent(new Event('change'));

// Process input data
function processInput() {
    const arrivalTimes = document.getElementById('arrivalInput').value.trim().split(/\s+/).map(Number);
    const burstTimes = document.getElementById('burstInput').value.trim().split(/\s+/).map(Number);
    const priorityValues = document.getElementById('priorityValues').value.trim().split(/\s+/).map(Number);
    
    const selectedAlgorithm = algorithmSelect.value;
    const requiresPriority = selectedAlgorithm.includes('priority');
    
    // Validate input
    if (arrivalTimes.length !== burstTimes.length) {
        alert('Number of arrival times must match number of burst times');
        return;
    }
    
    if (requiresPriority && priorityValues.length !== arrivalTimes.length) {
        alert('Number of priority values must match number of processes');
        return;
    }
    
    // Create processes array
    processes = [];
    for (let i = 0; i < arrivalTimes.length; i++) {
        const process = {
            id: `P${i+1}`,
            arrivalTime: arrivalTimes[i],
            burstTime: burstTimes[i],
            remainingTime: burstTimes[i],
            priority: requiresPriority ? priorityValues[i] : 0
        };
        processes.push(process);
    }
    
    // Update process table
    updateProcessTable();
}

function updateProcessTable() {
    processTableBody.innerHTML = '';
    const selectedAlgorithm = algorithmSelect.value;
    const showPriority = selectedAlgorithm.includes('priority');
    
    processes.forEach((process, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${process.id}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            ${showPriority ? `<td>${process.priority}</td>` : ''}
        `;
        
        processTableBody.appendChild(row);
    });
}

// Calculate scheduling based on selected algorithm
function calculateScheduling() {
    if (processes.length === 0) {
        alert('Please enter process data first');
        return;
    }
    
    const selectedAlgorithm = algorithmSelect.value;
    let timeQuantum = selectedAlgorithm === 'rr' ? parseInt(document.getElementById('timeQuantum').value) : 0;
    
    if (selectedAlgorithm === 'rr' && (isNaN(timeQuantum) || timeQuantum <= 0)) {
        alert('Please enter a valid time quantum (positive number)');
        return;
    }
    
    // Reset any existing simulation
    resetSimulation();
    
    // Calculate based on selected algorithm
    let result;
    switch (selectedAlgorithm) {
        case 'fcfs':
            result = calculateFCFS();
            break;
        case 'sjf':
            result = calculateSJF();
            break;
        case 'srtf':
            result = calculateSRTF();
            break;
        case 'rr':
            result = calculateRoundRobin(timeQuantum);
            break;
        case 'priority-np':
            result = calculatePriority(false);
            break;
        case 'priority-p':
            result = calculatePriority(true);
            break;
        default:
            alert('Invalid algorithm selected');
            return;
    }
    
    // Store the result for live visualization
    lastResult = result;
    
    // Display results
    displayGanttChart(result.ganttChart);
    displayResults(result.processes);
}

// First Come First Served algorithm
function calculateFCFS() {
    // Sort processes by arrival time
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    const ganttChart = [];
    const resultProcesses = [];
    
    for (const process of sortedProcesses) {
        // If process arrives after current time, wait for it
        if (process.arrivalTime > currentTime) {
            ganttChart.push({
                processId: 'Idle',
                startTime: currentTime,
                endTime: process.arrivalTime
            });
            currentTime = process.arrivalTime;
        }
        
        // Execute the process
        const startTime = currentTime;
        const endTime = currentTime + process.burstTime;
        
        ganttChart.push({
            processId: process.id,
            startTime: startTime,
            endTime: endTime
        });
        
        // Calculate times
        const turnaroundTime = endTime - process.arrivalTime;
        const waitingTime = turnaroundTime - process.burstTime;
        
        resultProcesses.push({
            ...process,
            startTime,
            endTime,
            turnaroundTime,
            waitingTime
        });
        
        currentTime = endTime;
    }
    
    return {
        processes: resultProcesses,
        ganttChart
    };
}

// Shortest Job First (non-preemptive) algorithm
function calculateSJF() {
    const processesCopy = processes.map(p => ({ ...p, remainingTime: p.burstTime }));
    let currentTime = 0;
    const ganttChart = [];
    const resultProcesses = [];
    const readyQueue = [];
    
    while (processesCopy.length > 0 || readyQueue.length > 0) {
        // Add arrived processes to ready queue
        for (let i = 0; i < processesCopy.length; i++) {
            if (processesCopy[i].arrivalTime <= currentTime) {
                readyQueue.push(processesCopy.splice(i, 1)[0]);
                i--; // Adjust index after removal
            }
        }
        
        if (readyQueue.length === 0) {
            // No processes ready, find next arrival time
            if (processesCopy.length > 0) {
                const nextArrival = Math.min(...processesCopy.map(p => p.arrivalTime));
                ganttChart.push({
                    processId: 'Idle',
                    startTime: currentTime,
                    endTime: nextArrival
                });
                currentTime = nextArrival;
            }
            continue;
        }
        
        // Sort ready queue by burst time (SJF)
        readyQueue.sort((a, b) => a.burstTime - b.burstTime);
        
        // Execute the shortest job
        const process = readyQueue.shift();
        const startTime = currentTime;
        const endTime = currentTime + process.burstTime;
        
        ganttChart.push({
            processId: process.id,
            startTime,
            endTime
        });
        
        // Calculate times
        const turnaroundTime = endTime - process.arrivalTime;
        const waitingTime = turnaroundTime - process.burstTime;
        
        resultProcesses.push({
            ...process,
            startTime,
            endTime,
            turnaroundTime,
            waitingTime
        });
        
        currentTime = endTime;
    }
    
    return {
        processes: resultProcesses,
        ganttChart
    };
}

// Shortest Remaining Time First (preemptive) algorithm
function calculateSRTF() {
    const processesCopy = processes.map(p => ({ ...p, remainingTime: p.burstTime }));
    let currentTime = 0;
    const ganttChart = [];
    const resultProcesses = [];
    const readyQueue = [];
    
    while (processesCopy.length > 0 || readyQueue.length > 0) {
        // Add arrived processes to ready queue
        for (let i = 0; i < processesCopy.length; i++) {
            if (processesCopy[i].arrivalTime <= currentTime) {
                readyQueue.push(processesCopy.splice(i, 1)[0]);
                i--; // Adjust index after removal
            }
        }
        
        if (readyQueue.length === 0) {
            // No processes ready, find next arrival time
            if (processesCopy.length > 0) {
                const nextArrival = Math.min(...processesCopy.map(p => p.arrivalTime));
                ganttChart.push({
                    processId: 'Idle',
                    startTime: currentTime,
                    endTime: nextArrival
                });
                currentTime = nextArrival;
            }
            continue;
        }
        
        // Sort ready queue by remaining time (SRTF)
        readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
        
        const process = readyQueue[0];
        
        // Find next event (process arrival or completion)
        let nextEventTime;
        if (processesCopy.length > 0) {
            nextEventTime = Math.min(
                currentTime + process.remainingTime,
                Math.min(...processesCopy.map(p => p.arrivalTime))
            );
        } else {
            nextEventTime = currentTime + process.remainingTime;
        }
        
        const executionTime = nextEventTime - currentTime;
        
        // Add to Gantt chart
        if (ganttChart.length > 0 && ganttChart[ganttChart.length - 1].processId === process.id) {
            // Extend existing block
            ganttChart[ganttChart.length - 1].endTime = nextEventTime;
        } else {
            // Add new block
            ganttChart.push({
                processId: process.id,
                startTime: currentTime,
                endTime: nextEventTime
            });
        }
        
        // Update process remaining time
        process.remainingTime -= executionTime;
        
        if (process.remainingTime <= 0) {
            // Process completed
            readyQueue.shift();
            
            const endTime = nextEventTime;
            const turnaroundTime = endTime - process.arrivalTime;
            const waitingTime = turnaroundTime - process.burstTime;
            
            resultProcesses.push({
                ...process,
                startTime: endTime - process.burstTime, // actual start time is completion - burst time
                endTime,
                turnaroundTime,
                waitingTime
            });
        }
        
        currentTime = nextEventTime;
    }
    
    return {
        processes: resultProcesses,
        ganttChart
    };
}

// Round Robin algorithm
function calculateRoundRobin(timeQuantum) {
    const processesCopy = processes.map(p => ({ ...p, remainingTime: p.burstTime }));
    let currentTime = 0;
    const ganttChart = [];
    const resultProcesses = [];
    const readyQueue = [];
    
    while (processesCopy.length > 0 || readyQueue.length > 0) {
        // Add arrived processes to ready queue
        for (let i = 0; i < processesCopy.length; i++) {
            if (processesCopy[i].arrivalTime <= currentTime) {
                readyQueue.push(processesCopy.splice(i, 1)[0]);
                i--; // Adjust index after removal
            }
        }
        
        if (readyQueue.length === 0) {
            // No processes ready, find next arrival time
            if (processesCopy.length > 0) {
                const nextArrival = Math.min(...processesCopy.map(p => p.arrivalTime));
                ganttChart.push({
                    processId: 'Idle',
                    startTime: currentTime,
                    endTime: nextArrival
                });
                currentTime = nextArrival;
            }
            continue;
        }
        
        // Get next process from ready queue
        const process = readyQueue.shift();
        const executionTime = Math.min(timeQuantum, process.remainingTime);
        const startTime = currentTime;
        const endTime = currentTime + executionTime;
        
        // Add to Gantt chart
        ganttChart.push({
            processId: process.id,
            startTime,
            endTime
        });
        
        // Update remaining time
        process.remainingTime -= executionTime;
        
        // Add arrived processes during this execution
        for (let i = 0; i < processesCopy.length; i++) {
            if (processesCopy[i].arrivalTime <= endTime) {
                readyQueue.push(processesCopy.splice(i, 1)[0]);
                i--; // Adjust index after removal
            }
        }
        
        if (process.remainingTime > 0) {
            // Process not finished, add back to ready queue
            readyQueue.push(process);
        } else {
            // Process completed
            const turnaroundTime = endTime - process.arrivalTime;
            const waitingTime = turnaroundTime - process.burstTime;
            
            resultProcesses.push({
                ...process,
                startTime: endTime - process.burstTime, // actual start time is completion - burst time
                endTime,
                turnaroundTime,
                waitingTime
            });
        }
        
        currentTime = endTime;
    }
    
    return {
        processes: resultProcesses,
        ganttChart
    };
}

// Priority Scheduling algorithm
function calculatePriority(preemptive) {
    const processesCopy = processes.map(p => ({ ...p, remainingTime: p.burstTime }));
    let currentTime = 0;
    const ganttChart = [];
    const resultProcesses = [];
    const readyQueue = [];
    
    while (processesCopy.length > 0 || readyQueue.length > 0) {
        // Add arrived processes to ready queue
        for (let i = 0; i < processesCopy.length; i++) {
            if (processesCopy[i].arrivalTime <= currentTime) {
                readyQueue.push(processesCopy.splice(i, 1)[0]);
                i--; // Adjust index after removal
            }
        }
        
        if (readyQueue.length === 0) {
            // No processes ready, find next arrival time
            if (processesCopy.length > 0) {
                const nextArrival = Math.min(...processesCopy.map(p => p.arrivalTime));
                ganttChart.push({
                    processId: 'Idle',
                    startTime: currentTime,
                    endTime: nextArrival
                });
                currentTime = nextArrival;
            }
            continue;
        }
        
        // Sort ready queue by priority (lower number = higher priority)
        readyQueue.sort((a, b) => a.priority - b.priority);
        
        const process = readyQueue[0];
        
        if (preemptive) {
            // Preemptive - check if a higher priority process arrives during execution
            let nextEventTime;
            if (processesCopy.length > 0) {
                nextEventTime = Math.min(
                    currentTime + process.remainingTime,
                    Math.min(...processesCopy.map(p => p.arrivalTime))
                );
            } else {
                nextEventTime = currentTime + process.remainingTime;
            }
            
            const executionTime = nextEventTime - currentTime;
            
            // Add to Gantt chart
            if (ganttChart.length > 0 && ganttChart[ganttChart.length - 1].processId === process.id) {
                // Extend existing block
                ganttChart[ganttChart.length - 1].endTime = nextEventTime;
            } else {
                // Add new block
                ganttChart.push({
                    processId: process.id,
                    startTime: currentTime,
                    endTime: nextEventTime
                });
            }
            
            // Update process remaining time
            process.remainingTime -= executionTime;
            
            if (process.remainingTime <= 0) {
                // Process completed
                readyQueue.shift();
                
                const endTime = nextEventTime;
                const turnaroundTime = endTime - process.arrivalTime;
                const waitingTime = turnaroundTime - process.burstTime;
                
                resultProcesses.push({
                    ...process,
                    startTime: endTime - process.burstTime, // actual start time is completion - burst time
                    endTime,
                    turnaroundTime,
                    waitingTime
                });
            }
            
            currentTime = nextEventTime;
        } else {
            // Non-preemptive - execute the entire process
            const startTime = currentTime;
            const endTime = currentTime + process.remainingTime;
            
            ganttChart.push({
                processId: process.id,
                startTime,
                endTime
            });
            
            // Remove from ready queue
            readyQueue.shift();
            
            // Calculate times
            const turnaroundTime = endTime - process.arrivalTime;
            const waitingTime = turnaroundTime - process.burstTime;
            
            resultProcesses.push({
                ...process,
                startTime,
                endTime,
                turnaroundTime,
                waitingTime
            });
            
            currentTime = endTime;
        }
    }
    
    return {
        processes: resultProcesses,
        ganttChart
    };
}

// Display Gantt chart
function displayGanttChart(ganttData) {
    ganttChart.innerHTML = '';
    
    if (ganttData.length === 0) return;
    
    const totalTime = ganttData[ganttData.length - 1].endTime;
    const containerWidth = ganttChart.offsetWidth;
    
    // Create blocks for each process in the Gantt chart
    ganttData.forEach(block => {
        const duration = block.endTime - block.startTime;
        const widthPercentage = (duration / totalTime) * 100;
        const width = Math.max(40, (containerWidth * widthPercentage / 100));
        
        const blockElement = document.createElement('div');
        blockElement.className = 'gantt-block';
        blockElement.style.width = `${width}px`;
        blockElement.style.backgroundColor = block.processId === 'Idle' ? 'var(--border-color)' : 
                                           processColors[parseInt(block.processId.substring(1)) % processColors.length];
        blockElement.innerHTML = `<span>${block.processId}</span>`;
        
        ganttChart.appendChild(blockElement);
    });
    
    // Add time markers
    const timeMarkers = document.createElement('div');
    timeMarkers.className = 'gantt-time';
    
    // Add start time
    const startTime = document.createElement('span');
    startTime.textContent = '0';
    timeMarkers.appendChild(startTime);
    
    // Add end time
    const endTime = document.createElement('span');
    endTime.textContent = totalTime.toString();
    timeMarkers.appendChild(endTime);
    
    ganttChart.parentNode.appendChild(timeMarkers);
}

// Display results table
function displayResults(processes) {
    if (processes.length === 0) return;
    
    let tableHTML = `
        <table class="result-table">
            <thead>
                <tr>
                    <th>Process</th>
                    <th>Arrival Time</th>
                    <th>Burst Time</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Turnaround Time</th>
                    <th>Waiting Time</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let totalTurnaround = 0;
    let totalWaiting = 0;
    
    processes.forEach(process => {
        totalTurnaround += process.turnaroundTime;
        totalWaiting += process.waitingTime;
        
        tableHTML += `
            <tr>
                <td>${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.startTime}</td>
                <td>${process.endTime}</td>
                <td>${process.turnaroundTime}</td>
                <td>${process.waitingTime}</td>
            </tr>
        `;
    });
    
    // Calculate averages
    const avgTurnaround = (totalTurnaround / processes.length).toFixed(2);
    const avgWaiting = (totalWaiting / processes.length).toFixed(2);
    
    tableHTML += `
            <tr class="average-row">
                <td colspan="5">Average</td>
                <td>${avgTurnaround}</td>
                <td>${avgWaiting}</td>
            </tr>
        </tbody>
        </table>
    `;
    
    resultTable.innerHTML = tableHTML;
}

// Live visualization functions
function startLiveVisualization(schedulingResult) {
    if (!schedulingResult || !schedulingResult.ganttChart) {
        alert('Please calculate scheduling first');
        return;
    }
    
    // Reset any existing simulation
    resetSimulation();
    
    // Initialize live visualization
    currentSimulationTime = 0;
    isSimulationPaused = false;
    
    // Clear live Gantt chart
    ganttChartLive.innerHTML = '';
    
    // Create timeline for the Gantt chart
    const totalTime = schedulingResult.ganttChart[schedulingResult.ganttChart.length - 1].endTime;
    const containerWidth = ganttChartLive.offsetWidth;
    
    // Create a container for the timeline
    const timeline = document.createElement('div');
    timeline.className = 'gantt-timeline';
    timeline.style.width = '100%';
    timeline.style.height = '100%';
    timeline.style.position = 'relative';
    ganttChartLive.appendChild(timeline);
    
    // Create blocks for each process in the Gantt chart
    schedulingResult.ganttChart.forEach(block => {
        const duration = block.endTime - block.startTime;
        const widthPercentage = (duration / totalTime) * 100;
        const width = Math.max(2, (containerWidth * widthPercentage / 100));
        const left = (block.startTime / totalTime) * 100;
        
        const blockElement = document.createElement('div');
        blockElement.className = 'gantt-block-live';
        blockElement.style.width = `${width}%`;
        blockElement.style.left = `${left}%`;
        blockElement.style.backgroundColor = block.processId === 'Idle' ? 'var(--border-color)' : 
                                           processColors[parseInt(block.processId.substring(1)) % processColors.length];
        blockElement.dataset.start = block.startTime;
        blockElement.dataset.end = block.endTime;
        blockElement.dataset.process = block.processId;
        
        const label = document.createElement('span');
        label.textContent = block.processId;
        blockElement.appendChild(label);
        
        timeline.appendChild(blockElement);
    });
    
    // Create time indicator
    const timeIndicator = document.createElement('div');
    timeIndicator.className = 'time-indicator';
    timeIndicator.style.height = '100%';
    timeIndicator.style.width = '2px';
    timeIndicator.style.backgroundColor = 'var(--danger-color)';
    timeIndicator.style.position = 'absolute';
    timeIndicator.style.left = '0';
    timeIndicator.style.top = '0';
    timeIndicator.style.zIndex = '10';
    timeline.appendChild(timeIndicator);
    
    // Set up simulation
    simulationInterval = setInterval(() => {
        if (!isSimulationPaused) {
            updateLiveVisualization(totalTime, timeIndicator);
        }
    }, simulationSpeed);
}

function updateLiveVisualization(totalTime, timeIndicator) {
    currentSimulationTime++;
    currentTimeDisplay.textContent = currentSimulationTime;
    
    // Update time indicator position
    const percentage = (currentSimulationTime / totalTime) * 100;
    timeIndicator.style.left = `${percentage}%`;
    
    // Highlight the current process block
    const blocks = document.querySelectorAll('.gantt-block-live');
    blocks.forEach(block => {
        const start = parseInt(block.dataset.start);
        const end = parseInt(block.dataset.end);
        
        if (currentSimulationTime >= start && currentSimulationTime < end) {
            block.style.opacity = '1';
            block.style.border = '2px solid var(--text-color)';
        } else {
            block.style.opacity = '0.7';
            block.style.border = 'none';
        } 
    });
    
    // Check if simulation is complete
    if (currentSimulationTime >= totalTime) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

function togglePause() {
    isSimulationPaused = !isSimulationPaused;
    pauseBtn.innerHTML = isSimulationPaused ? '<i class="fas fa-play"></i> Resume' : '<i class="fas fa-pause"></i> Pause';
}

function resetSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    currentSimulationTime = 0;
    isSimulationPaused = false;
    currentTimeDisplay.textContent = '0';
    ganttChartLive.innerHTML = '';
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
}