import { useOutletContext } from "react-router-dom";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";

/** The project resolved by ProjectLayout, shared with every project tab. */
export const useProjectContext = () => useOutletContext<{ project: Project }>().project;
