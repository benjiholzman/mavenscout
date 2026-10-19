// Hand-scoped bundle entry for design-sync — re-exports exactly the
// components chosen for the MavenScout design-sync import (see NOTES.md
// "Scope"). This is NOT auto-discovered; componentSrcMap in config.json
// mirrors this list for the converter's naming/grouping step. Add new
// components to both when expanding scope.
export { MultiSelect } from "../src/components/ui/MultiSelect.tsx";
export { TagPills } from "../src/components/ui/TagPills.tsx";
export { Modal } from "../src/components/ui/Modal.tsx";
export { Switch } from "../src/components/ui/Switch.tsx";
export { Carousel } from "../src/components/ui/Carousel.tsx";
export { GatePrompt } from "../src/components/ui/GatePrompt.tsx";
export { InfoTip } from "../src/components/ui/InfoTip.tsx";
export { OrgLogo } from "../src/components/ui/OrgLogo.tsx";
export { SignupPrompt } from "../src/components/ui/SignupPrompt.tsx";
export { Skeleton, DirectorySkeleton, ProfileSkeleton, RowsSkeleton } from "../src/components/ui/Skeletons.tsx";
export { VerifiedBadge, FirmTypeBadge, FeaturedRibbon, AvailabilityBadges, SelfAttestedMark } from "../src/components/ui/badges.tsx";
export { FlipCard } from "../src/components/directory/FlipCard.tsx";
