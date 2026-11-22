#!/usr/bin/env python3
"""Reads the job records of the semantic engine from the jobs table and their result objects from the
jobs bucket (read only), then prints per job: state, time, the phase records, the tokens and the cost,
and compares the Fit scores of the runs. Needs AWS credentials for the POC account.
Usage: python3 analyze-jobs.py"""
import gzip, json, subprocess, tempfile, os, sys
from collections import Counter

REGION = 'us-east-1'
TABLE = 'mavenscout-engine-jobs'
# Prices in USD per 1,000 tokens, AWS Price List API, service AmazonBedrock, us-east-1, on demand,
# read on 2026-11-21. Nova Lite input sku QRGWJ3P8FT28EYX2, output sku CBZ6A6U7XK8WJ3KA.
# Titan Text Embeddings V2 input sku EDNQYEHQ3XQ8N7EY.
NOVA_LITE_IN, NOVA_LITE_OUT, TITAN_IN = 0.00006, 0.00024, 0.00002
LABELS = ['API-1', 'UI-1', 'API-2', 'UI-2', 'API-3']   # in creation order of the semantic jobs of 2026-11-21

def aws(*args):
    return subprocess.run(['aws', *args, '--region', REGION, '--output', 'json'], check=True, capture_output=True, text=True).stdout

def un(v):
    (t, x), = v.items()
    return {'S': lambda: x, 'N': lambda: float(x) if '.' in x else int(x), 'BOOL': lambda: x, 'NULL': lambda: None,
            'L': lambda: [un(i) for i in x], 'M': lambda: {k: un(i) for k, i in x.items()}}.get(t, lambda: x)()

scan = json.loads(aws('dynamodb', 'scan', '--table-name', TABLE, '--filter-expression', 'attribute_exists(#r)',
                      '--expression-attribute-names', '{"#r":"record"}'))
items = [{k: un(v) for k, v in it.items()} for it in scan['Items']]
sem = sorted([i for i in items if (i.get('modelIds') or {}).get('fit', '').startswith('us.amazon')], key=lambda i: i['createdAt'])
sem = sem[-len(LABELS):]
bucket = json.loads(aws('s3api', 'list-buckets', '--query', "Buckets[?starts_with(Name,'mavenscout-engine-jobs-')].Name | [0]"))
results = {}
tmp = os.path.join(tempfile.mkdtemp(), 'r.gz')
for label, job in zip(LABELS, sem):
    subprocess.run(['aws', 's3', 'cp', f's3://{bucket}/{job["resultKey"]}', tmp, '--only-show-errors'], check=True)
    results[label] = (job, json.loads(gzip.open(tmp).read()))

print('Semantic jobs of the run, in creation order (job id shortened to 8 characters)')
tot_in = tot_out = 0
for label, (job, r) in results.items():
    s = job['settings']
    print(f"\n=== {label} {job['jobId'][:8]} state={r['state']} ranked={len(r['results'])} of {job['progress']['total']} "
          f"fallbacks={len(r['fallbacks'])} endToEndMs={job['endToEndMs']}")
    print(f"    models fit={r['modelIds']['fit']} text={r['modelIds']['text']} embed={r['modelIds']['embed']} index={r['modelIds']['index']} prompt={r['promptVersion']}")
    print(f"    settings fitCap={s['fitCap']} summaryCount={s['summaryCount']} parallelCalls={s['parallelCalls']} threshold={s['threshold']}")
    ti = to = 0
    for p in job['record']:
        cols = ['durationMs', 'calls', 'tokensIn', 'tokensOut', 'throttles', 'retries', 'fallbacks', 'skipped', 'beyondCap']
        print('    phase', p['phase'].ljust(12), ' '.join(f'{c}={p[c]}' for c in cols if c in p))
        if p['phase'] in ('fit', 'summary'):
            ti += p.get('tokensIn', 0); to += p.get('tokensOut', 0)
    cost = ti / 1000 * NOVA_LITE_IN + to / 1000 * NOVA_LITE_OUT
    fit_p = next(p for p in job['record'] if p['phase'] == 'fit')
    sum_p = next(p for p in job['record'] if p['phase'] == 'summary')
    sum_cost = sum_p['tokensIn'] / 1000 * NOVA_LITE_IN + sum_p['tokensOut'] / 1000 * NOVA_LITE_OUT
    print(f"    Nova Lite tokens in={ti} out={to}  cost USD {cost:.6f}  (summaries alone USD {sum_cost:.6f}, all of them fell back: {sum_p['fallbacks']} of {sum_p['calls']})")
    tot_in += ti; tot_out += to
print(f"\nTOTAL of the {len(results)} jobs: Nova Lite tokens in={tot_in} out={tot_out}  cost USD {tot_in/1000*NOVA_LITE_IN + tot_out/1000*NOVA_LITE_OUT:.6f}")

fit = lambda r: {x['profile_id']: x for x in r['results']}
def compare(a, b, label):
    fa, fb = fit(results[a][1]), fit(results[b][1])
    common = set(fa) & set(fb)
    diff = sorted((fa[p]['fit_score'] - fb[p]['fit_score']) for p in common if fa[p]['fit_score'] != fb[p]['fit_score'])
    print(f'{label}: common {len(common)}, identical Fit {len(common) - len(diff)}, different {len(diff)}, differences in points {diff}')
print('\nFit scores across runs (Fit judges one candidate at a time, so a difference is model noise, not pool dependence)')
compare('API-2', 'API-3', 'API-2 vs API-3, same pool repeated')
compare('API-3', 'UI-2', 'API-3 (98 pool) vs UI-2 (97 pool, other priorities)')
compare('API-3', 'API-1', 'API-3 vs API-1 (121 pool with firms, first index)')
compare('UI-2', 'UI-1', 'UI-2 vs UI-1 (before and after the index fix)')
top = lambda lab, n: [x['profile_id'] for x in results[lab][1]['results'][:n]]
print('top 10 identical API-2 vs API-3:', top('API-2', 10) == top('API-3', 10), '| top 5 identical API-3 vs UI-2:', top('API-3', 5) == top('UI-2', 5))
r3 = results['API-3'][1]
print('Fit distribution API-3 (score: candidates):', dict(sorted(Counter(x['fit_score'] for x in r3['results']).items(), reverse=True)))
print('bands API-3:', dict(Counter(x['band'] for x in r3['results'])))
print('summary fallback note present in the top 5 of API-3:', sum('standard summary' in x['narrative'] for x in r3['results'][:5]), 'of 5')
