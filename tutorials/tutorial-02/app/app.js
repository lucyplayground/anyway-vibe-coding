if (typeof Chart === "undefined") {
  document.getElementById("chart-error").hidden = false;
} else {
  for (const [id, type] of [["bar-chart", "bar"], ["line-chart", "line"]]) {
    new Chart(document.getElementById(id), {
      type,
      data: {
        labels: [],
        datasets: [],
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
            grid: { color: "#eef2f7" },
            border: { display: false },
            ticks: { color: "#64748b" },
          },
        },
      },
    });
  }
}
