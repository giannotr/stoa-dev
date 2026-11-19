# Gestapelte Balken für `BarChart`

## Ziel

`@stoa-dev/kit/display` soll pro Kategorie einen gestapelten Balken anzeigen können. Die Balkenlänge steht für den Gesamtwert, die Segmente zeigen dessen Anteile. Invoicer soll damit sein Monats- und Jahresdiagramm für bezahlte und offene Rechnungen abbilden können. Die Detailwerte sollen mit Tastatur, Maus und Touch erreichbar sein.

## Öffentliche API

Ausgangspunkt ist die [bestehende BarChart-Implementierung](../packages/kit/src/display/BarChart/index.tsx).

`BarChart` und `BarChartItem` bleiben unter `@stoa-dev/kit/display` verfügbar. `BarChartItem` unterstützt zwei Formen. Bestehende Aufrufe mit `value` behalten Darstellung und Verhalten. Ein gestapelter Eintrag leitet seinen Gesamtwert aus `segments` ab. TypeScript schließt die gleichzeitige Angabe von `value` und `segments` aus.

```tsx
type BarChartSegment = {
  id: string
  label: string
  value: number
  className?: string
}

type BarChartItemProps = {
  label: ReactNode
  display?: ReactNode
} & (
  | { value: number; segments?: never }
  | {
      segments: readonly BarChartSegment[]
      value?: never
      totalLabel: string
      detailLabel?: string
    }
)
```

- `className` am Segment setzt dessen Farbe mit Theme-Klassen der Anwendung. Das Segment erhält den stabilen Slot `bar-chart-segment`. Segment-IDs sind innerhalb eines Balkens eindeutig.
- `totalLabel` beschriftet den Gesamtwert in der Detailansicht. `detailLabel` kann die kurze sichtbare Beschriftung für den zugänglichen Namen und den Titel der Detailansicht ergänzen, etwa „November 2026“ statt „Nov.“.
- `BarChart` erhält optional `formatValue: (value: number) => string`. Der Formatter gilt für Gesamt- und Segmentwerte. Ohne Formatter werden die Zahlen als Text ausgegeben. Das bestehende `display` überschreibt weiterhin die sichtbare Zahl am Balken.
- Legendeneinträge bleiben in der Anwendung. Sie verwenden dieselben Bezeichnungen und Theme-Farben wie die Segmente.

## Skalierung und Darstellung

- Alle Einträge teilen sich eine Skala. Ohne gültiges `max` gilt wie bisher der größte Gesamtwert mit einer Untergrenze von 1. Ein endliches positives `max` setzt die Skala fest. Überschreitet ein Balken das feste Maximum, nimmt er die volle verfügbare Länge ein und behält die relativen Segmentanteile.
- Für gestapelte Einträge werden endliche, nichtnegative Werte unterstützt. Negative und nicht endliche Segmentwerte werden defensiv als 0 behandelt. Nullsegmente beanspruchen keinen Platz und erscheinen mit ihrem Nullwert in den Details. Leere Segmente ergeben einen Gesamtwert von 0. Auch ein Diagramm mit lauter Nullwerten erzeugt gültige Balkenabmessungen.
- Die Reihenfolge der Segmente entspricht der Eingabe. Horizontale Balken wachsen vom Zeilenanfang, vertikale Balken von unten. Die visuelle Rundung liegt an den Außenkanten des Stapels, damit zwischen Segmenten keine Lücken entstehen.
- Kategoriename und Gesamtwert bleiben sichtbar. Die horizontale Variante soll auch bei schmalem Fenster, langen Labels und lokalisierten Währungsbeträgen lesbar bleiben. Beide Varianten verwenden die Farben des aktiven Themes.

## Zugängliche Details

- Jeder gestapelte Eintrag erhält genau einen nativen Button mit sichtbarem Fokus. Sein zugänglicher Name enthält die Kategorie und den formatierten Gesamtwert. Die visuellen Segmente sind für assistive Technik ausgeblendet; ihre Werte stehen als Text in der Detailansicht.
- Klick, Tap, Enter oder Leertaste öffnen ein nicht modales Popover aus dem Kit. Es zeigt die Kategorie, den beschrifteten Gesamtwert und alle Segmentnamen mit ihren formatierten Werten in Eingabereihenfolge. Escape schließt das Popover und bringt den Fokus zum auslösenden Button zurück. Ein Klick außerhalb schließt es ebenfalls.
- Farbe erleichtert die Zuordnung im Balken. Die Detailansicht vermittelt dieselben Informationen über Text und Werte. Einfache Balken erhalten durch die Erweiterung keinen zusätzlichen Tabstopp.

## Referenzintegration in Invoicer

`StatisticsPage.tsx` verwendet dafür `statistics.periods` aus `invoiceStatistics.ts`. Die vorhandenen Filter nach Jahr und Währung bestimmen die Daten. „Alle Jahre“ zeigt Jahresbalken, ein einzelnes Jahr zeigt zwölf Monatsbalken einschließlich leerer Monate. Der Umschalter zwischen Betrag und Anzahl bleibt für das ganze Diagramm zuständig. Die Periodenzuordnung folgt weiterhin dem Rechnungsdatum.

| Metrik | Bezahlt | Offen |
| --- | --- | --- |
| Betrag | `period.paidAmount` | `period.amount - period.paidAmount` |
| Anzahl | `period.paidCount` | `period.count - period.paidCount` |

Bei Beträgen sollte die Anwendung die Differenz in kleinsten Währungseinheiten bilden oder auf die Nachkommastellen der Währung runden, damit Rundungsreste keine sichtbaren Segmente erzeugen. Die Summe beider Segmente entspricht den ausgestellten Rechnungen der Periode. Offene Rechnungen schließen überfällige ein. Entwürfe bleiben aus dem Diagramm ausgeschlossen. Die Anwendung übergibt die vorhandenen lokalisierten Betrags-, Zahlen- und Periodenformate sowie die Übersetzungen für „Ausgestellt“, „Bezahlt“ und „Offen“. Die Umstellung der Route erfolgt nach Verfügbarkeit der Kit-Erweiterung.

## Abnahmekriterien

- Die bestehenden Storybook-Beispiele für horizontale, vertikale und fest skalierte einfache Balken funktionieren mit unveränderten Aufrufen.
- Storybook zeigt gestapelte Balken in beiden Ausrichtungen und eine horizontale Monatsansicht bei schmalem Fenster. Testdaten enthalten einen leeren Monat, vollständig bezahlte und vollständig offene Perioden sowie eine gemischte Periode.
- Ein Skalierungstest prüft, dass ein Gesamtwert von 100 auf einer festen Skala von 200 den halben verfügbaren Platz belegt. Bei Teilwerten 75 und 25 nimmt das erste Segment drei Viertel des Stapels ein. Weitere Fälle prüfen die automatische Skala bei gemischten einfachen und gestapelten Einträgen, Nullwerte und ein überschrittenes Maximum.
- Ein Interaktionstest prüft Tastaturfokus, Öffnen per Enter und Leertaste, die formatierten Detailwerte sowie Schließen per Escape mit Fokusrückgabe. Das Popover ist auch per Tap erreichbar. Die Texte und Segmente bleiben im hellen und dunklen Theme unterscheidbar.
