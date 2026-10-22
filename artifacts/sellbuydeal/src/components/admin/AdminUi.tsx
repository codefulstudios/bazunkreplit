import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type HeaderProps={title:string;description?:string;actions?:ReactNode;eyebrow?:string};
export function AdminPageHeader({title,description,actions,eyebrow}:HeaderProps){
 return <header className="wp-page-header">
  <div className="min-w-0">{eyebrow&&<p className="wp-page-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>
  {actions&&<div className="wp-page-actions">{actions}</div>}
 </header>;
}
type PanelProps=HTMLAttributes<HTMLElement>&{title?:string;subtitle?:string;action?:ReactNode;children:ReactNode};
export function AdminPanel({title,subtitle,action,children,className="",...rest}:PanelProps){
 return <section {...rest} className={"wp-panel "+className}>
  {(title||action)&&<div className="wp-panel-heading"><div>{title&&<h2>{title}</h2>}{subtitle&&<p>{subtitle}</p>}</div>{action&&<div className="wp-panel-action">{action}</div>}</div>}
  <div className="wp-panel-body">{children}</div>
 </section>;
}
type MetricProps={label:string;value:string|number;detail?:string;icon:LucideIcon;tone?:"blue"|"green"|"violet"|"orange";onClick?:()=>void};
export function AdminMetric({label,value,detail,icon:Icon,tone="blue",onClick}:MetricProps){
 const inner=<><span className={"wp-metric-icon wp-tone-"+tone}><Icon size={23} aria-hidden="true"/></span><div className="min-w-0"><span className="wp-metric-label">{label}</span><strong className="wp-metric-value">{value}</strong>{detail&&<span className="wp-metric-detail">{detail}</span>}</div></>;
 return onClick?<button type="button" onClick={onClick} className="wp-metric wp-metric-action">{inner}</button>:<div className="wp-metric">{inner}</div>;
}
type ActionProps=ButtonHTMLAttributes<HTMLButtonElement>&{icon?:LucideIcon;variant?:"primary"|"secondary"|"quiet";children:ReactNode};
export function AdminAction({icon:Icon,variant="secondary",children,className="",...rest}:ActionProps){
 return <button {...rest} className={"wp-action wp-action-"+variant+" "+className}>{Icon&&<Icon size={16} aria-hidden="true"/>}{children}</button>;
}
export function AdminTableFrame({children,className=""}:{children:ReactNode;className?:string}){
 return <div className={"wp-table-frame "+className}><div className="wp-table-scroll">{children}</div></div>;
}
export function AdminEmptyState({title,description,children}:{title:string;description?:string;children?:ReactNode}){
 return <div className="wp-empty-state"><strong>{title}</strong>{description&&<p>{description}</p>}{children}</div>;
}
