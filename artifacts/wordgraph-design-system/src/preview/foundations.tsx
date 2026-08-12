import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Guidelines } from './parts';

const CORE_SWATCHES = [
  { name: 'Primary', className: 'bg-primary' },
  { name: 'Secondary', className: 'bg-secondary' },
  { name: 'Accent', className: 'bg-accent' },
] as const;

const SUPPORTING_SWATCHES = [
  { name: 'Background', className: 'border bg-background' },
  { name: 'Foreground', className: 'bg-foreground' },
  { name: 'Muted', className: 'bg-muted' },
  { name: 'Destructive', className: 'bg-destructive' },
  { name: 'Border', className: 'bg-border' },
] as const;

const GRAPH_SWATCHES = [
  { name: 'Synonym', className: 'bg-chart-1', note: 'Similar meaning' },
  { name: 'Antonym', className: 'bg-chart-2', note: 'Opposite meaning' },
  { name: 'Related', className: 'bg-chart-3', note: 'Contextual connection' },
] as const;

const TYPE_SCALE = [
  { label: 'Display', className: 'text-4xl font-bold' },
  { label: 'Heading', className: 'text-2xl font-semibold' },
  { label: 'Body', className: 'text-base' },
  { label: 'Label', className: 'text-sm font-medium' },
  { label: 'Caption', className: 'text-sm text-muted-foreground' },
] as const;

const SPACING_SCALE = [
  { label: '4', className: 'w-4' },
  { label: '8', className: 'w-8' },
  { label: '12', className: 'w-12' },
  { label: '16', className: 'w-16' },
  { label: '24', className: 'w-24' },
] as const;

function Swatch({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <div className={`h-16 rounded-lg ${className}`} />
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            The vocabulary graph is the hero
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Explore words through typography, space, and meaning.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            WordGraph keeps the interface quiet so the relationships between
            words can stay visible. Semantic color belongs to the graph; the
            personal library remains mostly monochrome.
          </p>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Core palette
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Graph relationships
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {GRAPH_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${swatch.className}`} />
              <div>
                <p className="text-sm font-medium">{swatch.name}</p>
                <p className="text-xs text-muted-foreground">{swatch.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Typography
          </h2>
          <div className="mt-4 space-y-3">
            {TYPE_SCALE.map((entry) => (
              <p key={entry.label} className={entry.className}>
                {entry.label}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            In use
          </h2>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Create workspace</CardTitle>
              <CardDescription>
                Components composed from the tokens above.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="overview-name">Workspace name</Label>
                <Input id="overview-name" placeholder="Enter a name" />
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked id="overview-notify" />
                <Label htmlFor="overview-notify">Email notifications</Label>
                <Badge className="ml-auto">New</Badge>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button>Save</Button>
              <Button variant="outline">Cancel</Button>
            </CardFooter>
          </Card>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Components
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Composition rules
        </h2>
        <div className="mt-4">
          <Guidelines
            items={[
              { kind: 'do', text: 'Let typography, whitespace, and position carry hierarchy.' },
              { kind: 'do', text: 'Keep the center word neutral, largest, and boldest.' },
              { kind: 'do', text: 'Use semantic colors only for graph words and their subtle lines.' },
              { kind: 'dont', text: 'Wrap graph words in colored circles, cards, or heavy borders.' },
              { kind: 'dont', text: 'Turn the personal library into a colorful dashboard.' },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Brand colors</h2>
          <p className="text-sm text-muted-foreground">
            The core roles used for emphasis, supporting actions, and accents.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Semantic and surface colors</h2>
          <p className="text-sm text-muted-foreground">
            Roles for text, backgrounds, borders, muted content, and danger.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SUPPORTING_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">Graph relationship colors</h2>
          <p className="text-sm text-muted-foreground">
            These are the only colors that carry semantic meaning in the
            exploration graph. They are intentionally muted and theme-aware.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {GRAPH_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="rounded-lg border p-4">
              <div className={`h-12 rounded-md ${swatch.className}`} />
              <p className="mt-3 text-sm font-medium">{swatch.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{swatch.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Font family
        </h2>
        <p className="mt-4 text-4xl font-bold">The quick brown fox</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The token font family is applied across this entire preview.
        </p>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Type scale
        </h2>
        {TYPE_SCALE.map((entry) => (
          <div key={entry.label} className="grid gap-2 sm:grid-cols-[88px_1fr]">
            <span className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {entry.label}
            </span>
            <p className={entry.className}>Build products people understand.</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function LayoutPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Spacing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The spacing scale, derived from the base spacing token.
        </p>
        <div className="mt-6 space-y-4">
          {SPACING_SCALE.map((space) => (
            <div key={space.label} className="flex items-center gap-4">
              <span className="w-8 text-xs text-muted-foreground">
                {space.label}
              </span>
              <div className={`h-3 rounded-full bg-primary ${space.className}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Radius</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Corner treatments derive from the base radius token.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Small', className: 'rounded-sm' },
            { label: 'Medium', className: 'rounded-md' },
            { label: 'Large', className: 'rounded-lg' },
            { label: 'Extra large', className: 'rounded-xl' },
          ].map((radius) => (
            <div
              key={radius.label}
              className={`flex h-24 items-end border bg-muted p-3 ${radius.className}`}
            >
              <span className="text-xs font-medium">{radius.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const GRAPH_WORDS = [
  { label: 'practical', relation: 'Synonym', className: 'text-chart-1', position: 'left-1/2 top-[12%] -translate-x-1/2' },
  { label: 'sensible', relation: 'Synonym', className: 'text-chart-1', position: 'left-[16%] top-1/2 -translate-y-1/2' },
  { label: 'idealistic', relation: 'Antonym', className: 'text-chart-2', position: 'right-[12%] top-1/2 -translate-y-1/2' },
  { label: 'decision', relation: 'Related', className: 'text-chart-3', position: 'left-[20%] bottom-[14%]' },
  { label: 'practicality', relation: 'Related', className: 'text-chart-3', position: 'right-[17%] bottom-[12%]' },
] as const;

export function GraphLanguagePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Applied example
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            A visual map for your vocabulary
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            The graph uses words as the objects. Lines stay light, nodes stay
            typographic, and every relationship is also named for accessible
            navigation.
          </p>
        </div>
        <div className="relative mt-8 min-h-[360px] overflow-hidden rounded-lg border bg-background">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 800 360"
            preserveAspectRatio="none"
          >
            <line x1="50%" y1="50%" x2="50%" y2="18%" stroke="var(--graph-synonym)" strokeOpacity=".3" />
            <line x1="50%" y1="50%" x2="22%" y2="50%" stroke="var(--graph-synonym)" strokeOpacity=".3" />
            <line x1="50%" y1="50%" x2="81%" y2="50%" stroke="var(--graph-antonym)" strokeOpacity=".3" />
            <line x1="50%" y1="50%" x2="28%" y2="80%" stroke="var(--graph-related)" strokeOpacity=".3" strokeDasharray="5 7" />
            <line x1="50%" y1="50%" x2="76%" y2="81%" stroke="var(--graph-related)" strokeOpacity=".3" strokeDasharray="5 7" />
          </svg>
          {GRAPH_WORDS.map((word) => (
            <button
              key={word.label}
              type="button"
              className={`absolute rounded-md px-2 py-1 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${word.className} ${word.position}`}
              aria-label={`${word.label}, ${word.relation} of Pragmatic`}
            >
              {word.label}
            </button>
          ))}
          <button
            type="button"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-5xl font-bold tracking-tight text-foreground transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Pragmatic, selected word"
          >
            PRAGMATIC
          </button>
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="text-chart-1">Synonym</span>
            <span className="text-chart-2">Antonym</span>
            <span className="text-chart-3">Related</span>
          </div>
        </div>
      </section>
    </div>
  );
}
