import { PROPERTY_FIELDS } from "../../services/settingsApi";
import { displayValue } from "../../utils/settingsHelpers.js";

export function PropertyValues({ values }) {
  return (
    <dl className="settings-values">
      {PROPERTY_FIELDS.map((field) => (
        <div key={field.key}>
          <dt>{field.label}</dt>
          <dd>{displayValue(values[field.key])}</dd>
        </div>
      ))}
    </dl>
  );
}
