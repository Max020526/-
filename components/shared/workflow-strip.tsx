import { Check } from "lucide-react";

export function WorkflowStrip({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="workflow-strip" aria-label={title}>
      <div className="workflow-title">{title}</div>
      <div className="workflow-steps">
        {steps.map((step, index) => (
          <div className="workflow-node" key={step}>
            <i>{index + 1}</i>
            <span>{step}</span>
            {index < steps.length - 1 ? <b aria-hidden="true">→</b> : <Check size={15} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </section>
  );
}
