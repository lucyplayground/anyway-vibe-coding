// 실습용 예시 판매액입니다. 실제 수치는 이 배열에서 수정하세요. (단위: 만원)
const salesData = [
  { month: "1월", sales: 120 },
  { month: "2월", sales: 150 },
  { month: "3월", sales: 180 },
  { month: "4월", sales: 140 },
  { month: "5월", sales: 210 },
  { month: "6월", sales: 240 },
];

const months = salesData.map(({ month }) => month);
const monthlySales = salesData.map(({ sales }) => sales);
let runningTotal = 0;
const cumulativeSales = monthlySales.map((sales) => {
  runningTotal += sales;
  return runningTotal;
});

const streamIntervalMs = 3000;
const maxVisibleMonths = 12;
const streamStatus = document.getElementById("stream-status");
const streamToggle = document.getElementById("toggle-stream");

if (typeof Chart === "undefined") {
  document.getElementById("chart-error").hidden = false;
  streamStatus.textContent = "차트를 불러오지 못해 자동 갱신을 시작하지 못했습니다.";
  streamToggle.checked = false;
} else {
  const chartStates = [];
  const charts = [
    {
      id: "bar-chart",
      checkboxId: "show-monthly-sales",
      type: "bar",
      dataset: {
        label: "월별 판매액 (만원)",
        data: monthlySales,
        backgroundColor: "#3b82f6",
        borderRadius: 4,
      },
    },
    {
      id: "line-chart",
      checkboxId: "show-cumulative-sales",
      type: "line",
      dataset: {
        label: "누적 판매액 (만원)",
        data: cumulativeSales,
        borderColor: "#0f766e",
        backgroundColor: "#0f766e",
        pointRadius: 4,
        fill: false,
        tension: 0,
      },
    },
  ];

  for (const { id, checkboxId, type, dataset } of charts) {
    const canvas = document.getElementById(id);

    const chart = new Chart(canvas, {
      type,
      data: {
        labels: months,
        datasets: [dataset],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            border: { color: "#cbd5e1" },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "판매액 (만원)" },
            grid: { color: "#eef2f7" },
            border: { display: false },
            ticks: { color: "#64748b" },
          },
        },
      },
    });

    const checkbox = document.getElementById(checkboxId);
    const syncCheckbox = () => {
      const visible = chart.isDatasetVisible(0);
      const description = `${dataset.label}: ${months.map((month, index) => `${month} ${dataset.data[index]}`).join(", ")}`;
      checkbox.checked = visible;
      canvas.setAttribute("aria-label", visible ? description : `${description} (데이터세트 숨김)`);
      canvas.textContent = description;
    };

    checkbox.addEventListener("change", () => {
      chart.setDatasetVisibility(0, checkbox.checked);
      chart.update();
      syncCheckbox();
    });

    // 범례로 표시 상태를 바꿔도 체크 상태를 같은 상태로 유지합니다.
    chart.options.plugins.legend.onClick = (event, item, legend) => {
      Chart.defaults.plugins.legend.onClick.call(legend, event, item, legend);
      syncCheckbox();
    };

    syncCheckbox();
    checkbox.disabled = false;
    chartStates.push({ chart, syncCheckbox });
  }

  let totalMonths = salesData.length;
  let streamingEnabled = true;
  let lastAdded = "";
  const updateStreamStatus = () => {
    const state = streamingEnabled ? "자동 갱신 중" : "일시 중지됨";
    streamStatus.textContent = `${state} · ${streamIntervalMs / 1000}초마다 예시 데이터 추가 · 최근 ${maxVisibleMonths}개월 표시${lastAdded}`;
    streamToggle.checked = streamingEnabled;
  };

  const appendRandomSales = () => {
    if (!streamingEnabled) return;
    const monthNumber = totalMonths % 12 + 1;
    const yearNumber = Math.floor(totalMonths / 12) + 1;
    const month = yearNumber === 1 ? `${monthNumber}월` : `${yearNumber}년차 ${monthNumber}월`;
    const sales = Math.floor(Math.random() * 201) + 100;
    totalMonths += 1;
    runningTotal += sales;

    salesData.push({ month, sales });
    months.push(month);
    monthlySales.push(sales);
    cumulativeSales.push(runningTotal);

    // 표시 범위를 제한해도 누적 합계는 첫 달부터의 총액을 유지합니다.
    if (months.length > maxVisibleMonths) {
      salesData.shift();
      months.shift();
      monthlySales.shift();
      cumulativeSales.shift();
    }

    for (const { chart, syncCheckbox } of chartStates) {
      chart.update();
      syncCheckbox();
    }

    lastAdded = ` · 최근 추가: ${month}, ${sales}만원`;
    updateStreamStatus();
  };

  let streamTimer;
  const startStreaming = () => {
    clearInterval(streamTimer);
    if (streamingEnabled) {
      streamTimer = setInterval(appendRandomSales, streamIntervalMs);
    }
  };

  streamToggle.addEventListener("change", () => {
    streamingEnabled = streamToggle.checked;
    startStreaming();
    updateStreamStatus();
  });

  updateStreamStatus();
  streamToggle.disabled = false;
  startStreaming();
  window.addEventListener("pagehide", () => clearInterval(streamTimer));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) startStreaming();
  });
}
