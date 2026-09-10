// Generates real inline SVG charts for Task 1 data-description prompts.

function lineChartSVG(series, xLabels, yMax, width, height) {
  width = width || 560; height = height || 260;
  const padL = 46, padR = 16, padT = 16, padB = 34;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const xStep = plotW / (xLabels.length - 1);
  const yPix = v => padT + plotH - (v / yMax) * plotH;
  const xPix = i => padL + i * xStep;

  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(yMax * i / 4);
    const y = yPix(val);
    grid += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="var(--rule)" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${val}</text>`;
  }
  const xLabelsSvg = xLabels.map((lbl, i) =>
    `<text x="${xPix(i)}" y="${height - padB + 20}" font-size="10.5" text-anchor="middle" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${lbl}</text>`
  ).join("");

  const lines = series.map(s => {
    const pts = s.values.map((v, i) => `${xPix(i)},${yPix(v).toFixed(1)}`).join(" ");
    const dots = s.values.map((v, i) => `<circle cx="${xPix(i)}" cy="${yPix(v).toFixed(1)}" r="3.5" fill="${s.color}"/>`).join("");
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5"/>${dots}`;
  }).join("");

  const legend = series.map(s =>
    `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${s.color};display:inline-block;"></span>${s.label}
    </span>`
  ).join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="max-width:${width}px;">${grid}${lines}${xLabelsSvg}</svg>
    <div style="margin-top:10px; font-size:0.82rem; color:var(--muted);">${legend}</div>`;
}

function barChartSVG(groups, yMax, width, height) {
  width = width || 560; height = height || 260;
  const padL = 46, padR = 16, padT = 16, padB = 34;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const groupW = plotW / groups.length;
  const yPix = v => padT + plotH - (v / yMax) * plotH;

  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(yMax * i / 4);
    const y = yPix(val);
    grid += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="var(--rule)" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${val}</text>`;
  }

  let bars = "", labels = "";
  groups.forEach((g, gi) => {
    const groupX = padL + gi * groupW;
    const barW = groupW * 0.28;
    const gap = groupW * 0.06;
    const startX = groupX + (groupW - (barW * g.bars.length + gap * (g.bars.length - 1))) / 2;
    g.bars.forEach((b, bi) => {
      const bx = startX + bi * (barW + gap);
      const by = yPix(b.value);
      const bh = padT + plotH - by;
      bars += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${b.color}" rx="2"/>`;
    });
    labels += `<text x="${groupX + groupW / 2}" y="${height - padB + 20}" font-size="10.5" text-anchor="middle" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${g.label}</text>`;
  });

  const legendSet = [];
  groups[0].bars.forEach(b => legendSet.push({ label: b.label, color: b.color }));
  const legend = legendSet.map(s =>
    `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;">
      <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block;"></span>${s.label}
    </span>`
  ).join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="max-width:${width}px;">${grid}${bars}${labels}</svg>
    <div style="margin-top:10px; font-size:0.82rem; color:var(--muted);">${legend}</div>`;
}

function pieChartSVG(data, size) {
  size = size || 160;
  const cx = size / 2, cy = size / 2, r = size / 2 - 6;
  let cumulative = 0, paths = "";
  data.forEach(d => {
    const startAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.value;
    const endAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const largeArc = d.value > 50 ? 1 : 0;
    paths += `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${d.color}" stroke="var(--white)" stroke-width="1.5"/>`;
  });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${paths}</svg>`;
}

function pieLegendHTML(data) {
  return data.map(d =>
    `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:0.8rem;color:var(--muted);">
      <span style="width:10px;height:10px;border-radius:2px;background:${d.color};display:inline-block;"></span>${d.label} (${d.value}%)
    </span>`
  ).join("");
}

function multiPieHTML(pies, size) {
  size = size || 150;
  return pies.map(p => `
    <div style="display:inline-block; text-align:center; margin-right:28px; vertical-align:top; margin-bottom:14px;">
      <div style="font-family:var(--mono); font-size:0.78rem; color:var(--muted); margin-bottom:8px;">${p.title}</div>
      ${pieChartSVG(p.data, size)}
      <div style="margin-top:8px; max-width:230px;">${pieLegendHTML(p.data)}</div>
    </div>`).join("");
}

function dataTableHTML(headers, rows) {
  const thead = headers.map(h => `<th>${h}</th>`).join("");
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<div class="table-scroll"><table class="compare-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
}
