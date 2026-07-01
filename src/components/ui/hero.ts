/**
 * Compatibility barrel: re-exports shadcn/ui primitives under the names the
 * app previously imported from `@heroui/react`, so page-level call sites only
 * need to swap the import path.
 */
export { Button } from "./button";
export { Card } from "./card";
export { Table } from "./table";
export { Chip, Badge } from "./badge";
export { Input } from "./input";
export { Textarea, TextArea } from "./textarea";
export { Link } from "./link";
export { Spinner } from "./spinner";
export { ScrollShadow } from "./scroll-shadow";
export { cn } from "@/lib/utils";
