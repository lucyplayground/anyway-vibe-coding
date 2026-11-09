// 실습용 예시 판매액입니다. 실제 수치는 이 배열에서 수정하세요. (단위: 만원)
const salesData = [
  { month: "1월", sales: 120 },
  { month: "2월", sales: 150 },
  { month: "3월", sales: 180 },
  { month: "4월", sales: 140 },
  { month: "5월", sales: 210 },
  { month: "6월", sales: 240 },
];

// 실제 시장 통계가 아닌 실습용 점유율입니다. 합계는 100%입니다.
const marketShareData = [
  { name: "A사", share: 40, color: "#3b82f6" },
  { name: "B사", share: 30, color: "#0f766e" },
  { name: "C사", share: 20, color: "#d97706" },
  { name: "기타", share: 10, color: "#8b5cf6" },
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

  const marketCanvas = document.getElementById("market-share-chart");
  const marketCheckbox = document.getElementById("show-market-share");
  const marketChart = new Chart(marketCanvas, {
    type: "pie",
    data: {
      labels: marketShareData.map(({ name, share }) => `${name} ${share}%`),
      datasets: [{
        label: "시장 점유율 (%)",
        data: marketShareData.map(({ share }) => share),
        backgroundColor: marketShareData.map(({ color }) => color),
        borderColor: "#fff",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            title: () => "",
            label: (context) => context.label,
          },
        },
      },
    },
  });

  const syncMarketCheckbox = () => {
    marketCheckbox.checked = marketChart.isDatasetVisible(0);
    const segments = marketShareData.map(({ name, share }, index) => {
      const hidden = !marketChart.isDatasetVisible(0) || !marketChart.getDataVisibility(index);
      return `${name} ${share}%${hidden ? " (숨김)" : ""}`;
    });
    const description = `시장 점유율 예시: ${segments.join(", ")}`;
    marketCanvas.setAttribute("aria-label", description);
    marketCanvas.textContent = description;
  };

  marketCheckbox.addEventListener("change", () => {
    marketChart.setDatasetVisibility(0, marketCheckbox.checked);
    marketChart.update();
    syncMarketCheckbox();
  });
  marketChart.options.plugins.legend.onClick = (event, item, legend) => {
    Chart.overrides.pie.plugins.legend.onClick.call(legend, event, item, legend);
    syncMarketCheckbox();
  };
  syncMarketCheckbox();
  marketCheckbox.disabled = false;

  let totalMonths = salesData.length;
  let streamingEnabled = true;
  let exporting = false;
  let lastAdded = "";
  const updateStreamStatus = () => {
    const state = streamingEnabled ? "자동 갱신 중" : "일시 중지됨";
    streamStatus.textContent = `${state} · ${streamIntervalMs / 1000}초마다 예시 데이터 추가 · 최근 ${maxVisibleMonths}개월 표시${lastAdded}`;
    streamToggle.checked = streamingEnabled;
  };

  const appendRandomSales = () => {
    if (!streamingEnabled || exporting) return;
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
    if (streamingEnabled && !exporting) {
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

  const dashboard = document.querySelector(".dashboard");
  const exportButton = document.getElementById("export-png");
  const exportStatus = document.getElementById("export-status");

  exportButton.addEventListener("click", async () => {
    if (exporting) return;
    if (typeof html2canvas !== "function") {
      exportStatus.textContent = "이미지 저장 기능을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.";
      return;
    }

    exporting = true;
    clearInterval(streamTimer);
    dashboard.setAttribute("aria-busy", "true");
    exportButton.disabled = true;
    exportButton.textContent = "PNG 생성 중…";
    exportStatus.textContent = "대시보드 이미지를 만들고 있습니다.";
    const controls = Array.from(dashboard.querySelectorAll("input"));
    const disabledStates = controls.map((control) => control.disabled);
    controls.forEach((control) => { control.disabled = true; });

    try {
      await document.fonts.ready;
      const allCharts = [...chartStates.map(({ chart }) => chart), marketChart];
      for (const chart of allCharts) {
        chart.stop();
        chart.setActiveElements([]);
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
        chart.update("none");
      }

      const grid = dashboard.querySelector(".chart-grid");
      const gridRect = grid.getBoundingClientRect();
      const cardRects = Array.from(grid.children, (card) => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left - gridRect.left, top: rect.top - gridRect.top, width: rect.width, height: rect.height };
      });

      const image = await html2canvas(dashboard, {
        backgroundColor: "#f5f7fb",
        scale: 2,
        logging: false,
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll("[data-export-ignore]").forEach((element) => element.remove());
          clonedDocument.querySelectorAll(".dashboard [hidden], .dashboard noscript").forEach((element) => element.remove());
          clonedDocument.querySelectorAll("canvas").forEach((canvas) => canvas.replaceChildren());
          // HTML2Canvas에서도 현재 CSS Grid 배치를 정확히 유지합니다.
          const clonedGrid = clonedDocument.querySelector(".chart-grid");
          Object.assign(clonedGrid.style, { display: "block", position: "relative", height: `${gridRect.height}px` });
          Array.from(clonedGrid.children).forEach((card, index) => {
            const rect = cardRects[index];
            Object.assign(card.style, { position: "absolute", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
          });
        },
      });
      const blob = await new Promise((resolve, reject) => {
        image.toBlob((result) => result ? resolve(result) : reject(new Error("PNG conversion failed")), "image/png");
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dashboard-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      exportStatus.textContent = "PNG 다운로드를 시작했습니다.";
    } catch (error) {
      console.error("PNG export failed", error);
      exportStatus.textContent = "PNG를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
    } finally {
      exporting = false;
      dashboard.removeAttribute("aria-busy");
      controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
      exportButton.disabled = false;
      exportButton.textContent = "PNG로 내보내기";
      startStreaming();
    }
  });
  exportButton.disabled = false;
}
