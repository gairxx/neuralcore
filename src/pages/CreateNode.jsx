import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NODE_TYPES = [
  { value: 'concept', label: 'Concept' },
  { value: 'fact', label: 'Fact' },
  { value: 'insight', label: 'Insight' },
  { value: 'quote', label: 'Quote' },
  { value: 'question', label: 'Question' },
  { value: 'person', label: 'Person' },
  { value: 'event', label: 'Event' },
  { value: 'tool', label: 'Tool' },
  { value: 'custom', label: 'Custom' },
];

export default function CreateNode() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'concept',
    content: '',
    properties: '',
    importance: 5,
    color: '',
  });
  const [jsonError, setJsonError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    // Validate JSON if provided
    if (form.properties.trim()) {
      try {
        JSON.parse(form.properties);
        setJsonError('');
      } catch {
        setJsonError('Invalid JSON in properties field');
        return;
      }
    }

    setSaving(true);
    const data = {
      name: form.name.trim(),
      type: form.type,
      content: form.content.trim(),
      importance: form.importance,
    };
    if (form.properties.trim()) data.properties = form.properties.trim();
    if (form.color.trim()) data.color = form.color.trim();

    const created = await base44.entities.GraphNode.create(data);
    setSaving(false);
    navigate(`/nodes/${created.id}`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h2 className="text-lg font-semibold text-foreground font-heading">Create Node</h2>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          <div>
            <Label className="text-xs mb-1">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Transformer Architecture"
              className="font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">Importance ({form.importance}/10)</Label>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.importance}
                  onChange={(e) => setForm({ ...form, importance: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-primary w-6">{form.importance}</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1">Color (optional hex)</Label>
            <div className="flex items-center gap-2">
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#4F8CF7"
                className="font-mono w-32"
              />
              {form.color && (
                <span
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: form.color }}
                />
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1">Content</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Store the full knowledge, fact, or insight here..."
              className="min-h-[150px] font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-xs mb-1">Properties (JSON metadata, optional)</Label>
            <Textarea
              value={form.properties}
              onChange={(e) => {
                setForm({ ...form, properties: e.target.value });
                setJsonError('');
              }}
              placeholder='{"source": "arxiv.org", "confidence": 0.95}'
              className="min-h-[80px] font-mono text-xs"
            />
            {jsonError && <p className="text-xs text-destructive mt-1">{jsonError}</p>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Node
            </Button>
            <Link to="/">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}