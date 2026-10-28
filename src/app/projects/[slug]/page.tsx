// Adapted from Dao-Ho/portfolio src/app/projects/[slug]/page.tsx. See CREDITS.md.
import { notFound } from "next/navigation";
import { projects } from "@/portfolio/content";
import ProjectPage from "@/portfolio/ProjectPage";
import CephaleeCase from "@/portfolio/cases/CephaleeCase";

export const dynamicParams = false;
export function generateStaticParams() { return projects.map(project => ({ slug: project.slug })); }

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = projects.find(project => project.slug === slug);
  return project ? { title: `${project.name} — Nathan Toto`, description: project.description } : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const project = projects.find(project => project.slug === slug);
  if (!project) notFound();
  return <ProjectPage project={project}>{slug === "cephalee" ? <CephaleeCase /> : undefined}</ProjectPage>;
}
