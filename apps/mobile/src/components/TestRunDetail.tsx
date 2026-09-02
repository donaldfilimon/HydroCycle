import { StyleSheet, Text } from "react-native";

import {
  retentionComparisonSeries,
  type ChartSeries,
  type TestRunView,
} from "@hydrocycle/view-model";

import { formatNumber, formatText, formatWithUnit } from "../format";
import { theme } from "../theme";
import { TraceChart } from "./TraceChart";
import { Card, Note, Row } from "./ui";

export default function TestRunDetail({ run }: { run: TestRunView }) {
  const status = run.status.replace("_", " ");
  const retention = retentionComparisonSeries(run);
  const retentionSeries = [retention.measured, retention.modeled].filter(
    (series): series is ChartSeries => series !== null,
  );
  return (
    <Card title="Selected run detail" subtitle={run.name}>
      <Row
        label="Status"
        value={`${status}${run.synthetic ? " · synthetic" : ""}`}
      />
      <Row label="Operator" value={formatText(run.operator)} />
      <Row label="Sample" value={formatText(run.sampleId)} />
      <Row label="Method" value={formatText(run.method)} />
      <Row
        label="Provenance source"
        value={formatText(run.provenance.source)}
      />
      <Row
        label="Calibration reference"
        value={formatText(run.calibrationReference)}
      />
      <Row
        label="Calibration references"
        value={String(run.calibrationReferences.length)}
      />
      <Row label="Total H2" value={formatWithUnit(run.totalH2MgL, "mg/L")} />
      <Row
        label="Total H2 uncertainty"
        value={formatWithUnit(run.standardUncertainty.totalH2MgL, "mg/L")}
      />
      <Row
        label="Retained H2"
        value={formatWithUnit(run.retainedH2MgL, "mg/L")}
      />
      <Row
        label="Retained H2 uncertainty"
        value={formatWithUnit(run.standardUncertainty.retainedH2MgL, "mg/L")}
      />
      <Row
        label="Retention fraction"
        value={formatNumber(run.retentionFraction, 3)}
      />
      <Row
        label="Retention fraction uncertainty"
        value={formatNumber(run.standardUncertainty.retentionFraction, 3)}
      />
      <Row
        label="Released H2"
        value={formatWithUnit(run.releasedH2MgL, "mg/L")}
      />
      <Row
        label="Released H2 uncertainty"
        value={formatWithUnit(run.standardUncertainty.releasedH2MgL, "mg/L")}
      />
      <Row
        label="Unaccounted H2"
        value={formatWithUnit(run.unaccountedH2MgL, "mg/L")}
      />
      <Row
        label="Unaccounted H2 uncertainty"
        value={formatWithUnit(run.standardUncertainty.unaccountedH2MgL, "mg/L")}
      />
      <Row label="Temperature" value={formatWithUnit(run.temperatureC, "°C")} />
      <Row
        label="Temperature uncertainty"
        value={formatWithUnit(run.standardUncertainty.temperatureC, "°C")}
      />
      <Row label="Pressure" value={formatWithUnit(run.pressureKpa, "kPa")} />
      <Row
        label="Pressure uncertainty"
        value={formatWithUnit(run.standardUncertainty.pressureKpa, "kPa")}
      />
      <Row label="Elapsed" value={formatWithUnit(run.elapsedS, "s")} />
      <Row
        label="Elapsed uncertainty"
        value={formatWithUnit(run.standardUncertainty.elapsedS, "s")}
      />
      <Row
        label="Bubble diameter"
        value={formatWithUnit(run.bubbleDiameterNm, "nm")}
      />
      <Row
        label="Bubble diameter uncertainty"
        value={formatWithUnit(run.standardUncertainty.bubbleDiameterNm, "nm")}
      />
      <Row
        label="Bubble number"
        value={formatWithUnit(run.numberPerMl, "1/mL")}
      />
      <Row
        label="Bubble number uncertainty"
        value={formatWithUnit(run.standardUncertainty.numberPerMl, "1/mL")}
      />
      <Row
        label="Hydrogen decay series"
        value={
          run.hydrogenDecaySeries
            ? `${run.hydrogenDecaySeries.length} points`
            : formatText(null)
        }
      />
      <Row
        label="Bubble distribution"
        value={
          run.bubbleDistribution
            ? `${run.bubbleDistribution.length} bins`
            : formatText(null)
        }
      />
      <Row
        label="Pressure trace"
        value={
          run.pressureTrace
            ? `${run.pressureTrace.length} points`
            : formatText(null)
        }
      />
      <Row
        label="Comparisons"
        value={String(run.comparisons.items?.length ?? 0)}
      />
      <Row
        label="Evidence records"
        value={String(run.testRunEvidence.length)}
      />
      <Row label="Attachments" value={String(run.attachmentHashes.length)} />
      <Row
        label="Linked simulations"
        value={String(run.simulationIds.length)}
      />
      {run.attachmentHashes.map((hash, index) => (
        <Row key={hash} label={`Attachment ${index + 1}`} value={hash} />
      ))}
      {run.simulationIds.map((id, index) => (
        <Row key={id} label={`Simulation ${index + 1}`} value={id} />
      ))}
      <Row label="Review notes" value={formatText(run.reviewNotes)} />
      {retentionSeries.length > 0 ? (
        <>
          <TraceChart
            title="Retention comparison"
            series={retentionSeries}
            xUnit="s"
            yUnit="mg/L"
          />
          <Note>
            The first-order endpoint fit is a client-side preview, not a saved
            model result or an independent measurement.
          </Note>
          {retention.residual ? (
            <TraceChart
              title="Retention residual"
              series={[retention.residual]}
              xUnit="s"
              yUnit="mg/L"
            />
          ) : null}
        </>
      ) : (
        <Note>
          Retention comparison unavailable; absent series data are not inferred.
        </Note>
      )}
      {run.synthetic ? (
        <Text style={styles.notice}>
          Synthetic runs are read-only on mobile.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  notice: { color: theme.color.warn, fontSize: 12, marginTop: theme.space.sm },
});
