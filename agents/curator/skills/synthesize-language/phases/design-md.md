## DESIGN.md PHASE

Generate the portable DESIGN.md artifact from the same native Katagami fields
you just wrote. The finalizer verifies the attached file and lint metadata; it
does not generate or repair DESIGN.md for you.

The DESIGN.md must include valid frontmatter, token references, component
semantics, and the `## shadcn/ui Usage` section described above. Write it to
`/tmp/DESIGN.md` in the sandbox, then run the no-network Katagami contract
checker with `python3`. Do not use `npx`, package installs, or networked lint
tools in production sessions:

```python
lint_script = r'''
json_module = __import__('json')
pathlib = __import__('pathlib')
re = __import__('re')

path = pathlib.Path('/tmp/DESIGN.md')
text = path.read_text(encoding='utf-8') if path.exists() else ''
errors = []
warnings = []

def error(code, message):
    errors.append({'code': code, 'message': message})

if not text.strip():
    error('empty_design_md', 'DESIGN.md is empty')
elif not text.startswith('---\n'):
    error('missing_frontmatter', 'DESIGN.md must start with YAML frontmatter')
else:
    close = text.find('\n---', 4)
    if close == -1:
        error('missing_frontmatter_close', 'YAML frontmatter must be closed')
        frontmatter = ''
    else:
        frontmatter = text[4:close]
    for key in ['version:', 'name:', 'description:', 'colors:', 'typography:', 'rounded:', 'spacing:', 'components:']:
        if key not in frontmatter:
            error('missing_frontmatter_key', f'frontmatter missing {key}')

for heading in ['## Overview', '## Colors', '## Typography', '## Layout', '## Components', "## Do's and Don'ts", '## shadcn/ui Usage']:
    if heading not in text:
        error('missing_section', f'missing {heading}')

for ref in ['/language/{language_id}/DESIGN.with-shadcn.md', '/shadcn.json', '/shadcn-components.md', '/shadcn-shots.json', '@/components/ui/*']:
    if ref not in text:
        error('missing_shadcn_reference', f'missing {ref}')

if len(re.findall(r'#[0-9a-fA-F]{6}\b', text)) < 8:
    error('insufficient_color_tokens', 'include at least eight concrete hex color tokens')
if 'fonts.googleapis.com' not in text:
    error('missing_google_fonts_url', 'include the production Google Fonts URL')
if re.search(r'\b(TBD|TODO|lorem ipsum|placeholder)\b', text, re.IGNORECASE):
    error('placeholder_text', 'remove placeholder text before attaching DESIGN.md')

print(json_module.dumps({
    'tool': 'katagami-design-md-contract',
    'format': 'json',
    'summary': {'errors': len(errors), 'warnings': len(warnings)},
    'errors': errors,
    'warnings': warnings,
}, ensure_ascii=False))
'''.replace('\n     ', '\n').lstrip()
sandbox.write('/tmp/katagami_design_md_lint.py', lint_script)
lint_output = sandbox.bash('python3 /tmp/katagami_design_md_lint.py')
start = lint_output.find('{')
end = lint_output.rfind('}') + 1
lint_result = json.loads(lint_output[start:end])
```

Warnings are blocking. Parse only the JSON object emitted by the checker; never
store the shell transcript or any string containing `exit code`, `STDERR`, or
`command not found` in `design_md_lint_result`. If `summary.errors > 0` or
`summary.warnings > 0`, rewrite the DESIGN.md and rerun the checker before
attaching. Attach only the exact markdown that passed lint:

```python
design_md_result = temper.write('/katagami/design-md/' + slug + '/DESIGN.md', design_md)
temper.action('DesignLanguages', eid, 'AttachDesignMd', {
    'design_md_file_id': design_md_result['file_id'],
    'design_md_lint_result': json.dumps(lint_result, ensure_ascii=False),
    'design_md_format_version': 'alpha'
})
```

