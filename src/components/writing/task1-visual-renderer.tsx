import type { Task1VisualDatum, Task1VisualPrompt } from '@/lib/domain';

interface Props {
  visual: Task1VisualPrompt;
}

interface NumericDatum extends Task1VisualDatum {
  numericValue: number;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 280;
const CHART_MARGIN = { top: 20, right: 20, bottom: 52, left: 64 };

function parseNumericValue(value: string) {
  const normalized = value.replace(/,/g, '');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const numericValue = Number.parseFloat(match[0]);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getNumericData(dataPoints: Task1VisualDatum[]) {
  return dataPoints.flatMap((point) => {
    const numericValue = parseNumericValue(point.value);

    return numericValue === null
      ? []
      : [{ ...point, numericValue }];
  });
}

function getChartCoordinates(data: NumericDatum[]) {
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const maxValue = Math.max(...data.map((item) => item.numericValue), 1);
  const yMax = maxValue * 1.1;

  return data.map((point, index) => {
    const x = CHART_MARGIN.left + (data.length === 1 ? plotWidth / 2 : (index * plotWidth) / (data.length - 1));
    const y = CHART_MARGIN.top + plotHeight - (point.numericValue / yMax) * plotHeight;

    return {
      ...point,
      x,
      y,
    };
  });
}

function formatValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function buildPieSlicePath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const startRadians = (startAngle - 90) * (Math.PI / 180);
  const endRadians = (endAngle - 90) * (Math.PI / 180);
  const x1 = centerX + radius * Math.cos(startRadians);
  const y1 = centerY + radius * Math.sin(startRadians);
  const x2 = centerX + radius * Math.cos(endRadians);
  const y2 = centerY + radius * Math.sin(endRadians);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

function VisualDataTable({ visual }: Props) {
  return (
    <div className="visual-data-table-shell">
      <table aria-label={`${visual.title} data table`} className="visual-data-table">
        <thead>
          <tr>
            <th scope="col">{visual.xAxisLabel ?? 'Label'}</th>
            <th scope="col">{visual.yAxisLabel ?? visual.units ?? 'Value'}</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {visual.dataPoints.map((point) => (
            <tr key={`${point.label}-${point.value}`}>
              <th scope="row">{point.label}</th>
              <td>{point.value}</td>
              <td>{point.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineChart({ visual }: Props) {
  const numericData = getNumericData(visual.dataPoints);

  if (numericData.length < 2) {
    return <VisualDataTable visual={visual} />;
  }

  const coordinates = getChartCoordinates(numericData);
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const yTicks = 4;
  const yMax = Math.max(...numericData.map((item) => item.numericValue), 1) * 1.1;
  const polylinePoints = coordinates.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <figure className="visual-figure">
      <svg
        aria-label={`Line chart for ${visual.title}`}
        className="visual-svg"
        role="img"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        {Array.from({ length: yTicks + 1 }, (_, index) => {
          const ratio = index / yTicks;
          const y = CHART_MARGIN.top + ratio * plotHeight;
          const tickValue = formatValue(yMax - ratio * yMax);

          return (
            <g key={tickValue}>
              <line
                className="chart-grid-line"
                x1={CHART_MARGIN.left}
                x2={CHART_WIDTH - CHART_MARGIN.right}
                y1={y}
                y2={y}
              />
              <text className="chart-axis-label" textAnchor="end" x={CHART_MARGIN.left - 10} y={y + 4}>
                {tickValue}
              </text>
            </g>
          );
        })}

        <line
          className="chart-axis-line"
          x1={CHART_MARGIN.left}
          x2={CHART_MARGIN.left}
          y1={CHART_MARGIN.top}
          y2={CHART_HEIGHT - CHART_MARGIN.bottom}
        />
        <line
          className="chart-axis-line"
          x1={CHART_MARGIN.left}
          x2={CHART_WIDTH - CHART_MARGIN.right}
          y1={CHART_HEIGHT - CHART_MARGIN.bottom}
          y2={CHART_HEIGHT - CHART_MARGIN.bottom}
        />

        <polyline className="chart-line" fill="none" points={polylinePoints} />

        {coordinates.map((point) => (
          <g key={point.label}>
            <circle className="chart-point" cx={point.x} cy={point.y} r="5" />
            <text className="chart-value-label" textAnchor="middle" x={point.x} y={point.y - 12}>
              {point.value}
            </text>
            <text
              className="chart-axis-label"
              textAnchor="middle"
              x={point.x}
              y={CHART_HEIGHT - CHART_MARGIN.bottom + 24}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="visual-caption">
        {visual.xAxisLabel ? `${visual.xAxisLabel} · ` : ''}
        {visual.yAxisLabel ? `${visual.yAxisLabel}` : visual.units ?? 'Values'}
      </figcaption>
    </figure>
  );
}

function BarChart({ visual }: Props) {
  const numericData = getNumericData(visual.dataPoints);

  if (numericData.length === 0) {
    return <VisualDataTable visual={visual} />;
  }

  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const maxValue = Math.max(...numericData.map((item) => item.numericValue), 1) * 1.1;
  const gap = 16;
  const barWidth = Math.max((plotWidth - gap * (numericData.length - 1)) / numericData.length, 24);

  return (
    <figure className="visual-figure">
      <svg
        aria-label={`Bar chart for ${visual.title}`}
        className="visual-svg"
        role="img"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        <line
          className="chart-axis-line"
          x1={CHART_MARGIN.left}
          x2={CHART_MARGIN.left}
          y1={CHART_MARGIN.top}
          y2={CHART_HEIGHT - CHART_MARGIN.bottom}
        />
        <line
          className="chart-axis-line"
          x1={CHART_MARGIN.left}
          x2={CHART_WIDTH - CHART_MARGIN.right}
          y1={CHART_HEIGHT - CHART_MARGIN.bottom}
          y2={CHART_HEIGHT - CHART_MARGIN.bottom}
        />
        {numericData.map((point, index) => {
          const height = (point.numericValue / maxValue) * plotHeight;
          const x = CHART_MARGIN.left + index * (barWidth + gap);
          const y = CHART_HEIGHT - CHART_MARGIN.bottom - height;

          return (
            <g key={point.label}>
              <rect
                className="chart-bar"
                height={height}
                rx="10"
                width={barWidth}
                x={x}
                y={y}
              />
              <text className="chart-value-label" textAnchor="middle" x={x + barWidth / 2} y={y - 10}>
                {point.value}
              </text>
              <text
                className="chart-axis-label"
                textAnchor="middle"
                x={x + barWidth / 2}
                y={CHART_HEIGHT - CHART_MARGIN.bottom + 24}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="visual-caption">{visual.summary}</figcaption>
    </figure>
  );
}

function PieChart({ visual }: Props) {
  const numericData = getNumericData(visual.dataPoints);

  if (numericData.length === 0) {
    return <VisualDataTable visual={visual} />;
  }

  const total = numericData.reduce((sum, item) => sum + item.numericValue, 0);
  const centerX = 170;
  const centerY = 130;
  const radius = 92;
  const colors = ['#38bdf8', '#0ea5e9', '#7dd3fc', '#22c55e', '#f59e0b', '#f87171'];
  const slices = numericData.reduce<{
    currentAngle: number;
    items: Array<{ label: string; fill: string; path: string }>;
  }>(
    (state, point, index) => {
      const sliceAngle = total === 0 ? 0 : (point.numericValue / total) * 360;
      const nextAngle = state.currentAngle + sliceAngle;

      return {
        currentAngle: nextAngle,
        items: [
          ...state.items,
          {
            label: point.label,
            fill: colors[index % colors.length],
            path: buildPieSlicePath(centerX, centerY, radius, state.currentAngle, nextAngle),
          },
        ],
      };
    },
    { currentAngle: 0, items: [] },
  ).items;

  return (
    <figure className="visual-figure visual-figure-split">
      <svg
        aria-label={`Pie chart for ${visual.title}`}
        className="visual-svg"
        role="img"
        viewBox="0 0 420 280"
      >
        {slices.map((slice) => {
          return <path className="chart-pie-slice" d={slice.path} fill={slice.fill} key={slice.label} />;
        })}
      </svg>
      <figcaption className="visual-caption">
        <ul className="plain-list compact-list visual-legend">
          {numericData.map((point, index) => {
            const percentage = total === 0 ? 0 : (point.numericValue / total) * 100;

            return (
              <li className="visual-legend-item" key={point.label}>
                <span
                  aria-hidden="true"
                  className="visual-legend-swatch"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span>
                  <strong>{point.label}</strong> — {point.value} ({percentage.toFixed(1)}%)
                </span>
              </li>
            );
          })}
        </ul>
      </figcaption>
    </figure>
  );
}

function ReportingCues({ visual }: Props) {
  return (
    <ul className="plain-list compact-list">
      {visual.xAxisLabel ? <li>Horizontal label: {visual.xAxisLabel}</li> : null}
      {visual.yAxisLabel ? <li>Vertical label: {visual.yAxisLabel}</li> : null}
      {visual.units ? <li>Units: {visual.units}</li> : null}
      <li>Focus on the main trend before smaller comparisons.</li>
    </ul>
  );
}

export function Task1VisualRenderer({ visual }: Props) {
  const usesTableRenderer = visual.type === 'table';
  const usesReportingCues = usesTableRenderer || visual.type === 'pie-chart';

  return (
    <>
      <div className="visual-renderer-shell">
        {visual.type === 'line-chart' ? <LineChart visual={visual} /> : null}
        {visual.type === 'bar-chart' ? <BarChart visual={visual} /> : null}
        {visual.type === 'table' ? <VisualDataTable visual={visual} /> : null}
        {visual.type === 'pie-chart' ? <PieChart visual={visual} /> : null}
        {visual.type === 'mixed' ? <BarChart visual={visual} /> : null}
      </div>
      <div className="visual-grid">
        <article className="history-card">
          <div className="history-card-header">
            <strong>Key features</strong>
          </div>
          <ul className="plain-list compact-list">
            {visual.keyFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </article>
        <article className="history-card">
          <div className="history-card-header">
            <strong>{usesReportingCues ? 'Reporting cues' : 'Data checkpoints'}</strong>
          </div>
          {usesReportingCues ? <ReportingCues visual={visual} /> : <VisualDataTable visual={visual} />}
        </article>
      </div>
    </>
  );
}
