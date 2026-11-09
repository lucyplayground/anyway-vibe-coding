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

if (typeof Chart === "undefined") {
  document.getElementById("chart-error").hidden = false;
} else {
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
    const description = `${dataset.label}: ${months.map((month, index) => `${month} ${dataset.data[index]}`).join(", ")}`;
    canvas.setAttribute("aria-label", description);
    canvas.textContent = description;

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
      checkbox.checked = visible;
      canvas.setAttribute("aria-label", visible ? description : `${description} (데이터세트 숨김)`);
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
  }
}
