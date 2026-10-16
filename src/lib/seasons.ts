/** Legacy `Season::getName()`: "2025/2026", or a single year when the season fits in one. */
export const seasonYears = (startYear: number, endYear: number) =>
	startYear === endYear ? String(startYear) : `${startYear}/${endYear}`;

/** How a season reads in lists and selects: its display name (if any) and its years. */
export const seasonLabel = (season: { name: string | null; startYear: number; endYear: number }) =>
	season.name
		? `${season.name} (${seasonYears(season.startYear, season.endYear)})`
		: seasonYears(season.startYear, season.endYear);
