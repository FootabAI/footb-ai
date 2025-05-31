import pandas as pd, random, json, pathlib, tqdm


# Load & group by country (nationality)
df = pd.read_csv("data/football_clubs.csv", encoding="utf-8")
by_nat = df.groupby("Country")["Name"].apply(list)

out_path = pathlib.Path("club_tune_1name.jsonl")
seen_names = set()

with out_path.open("w", encoding="utf-8") as out:
    for country, names in tqdm.tqdm(by_nat.items(), desc="countries"):
        names = [n for n in names if isinstance(n, str) and " " in n]
        if len(names) < 10:
            continue

        reps = 200 if len(names) > 120 else 400
        for _ in range(reps):
            few_shot = random.sample(names, min(10, len(names)))
            few_shot_block = "\n".join(f'"{n}"' for n in few_shot)

            parts = [n.split() for n in few_shot]
            prefixes = [p[0] for p in parts]
            suffixes = [p[-1] for p in parts if len(p) > 1]

            for _ in range(5):
                candidate = f"{random.choice(prefixes)} {random.choice(suffixes)}"
                if candidate not in few_shot and candidate not in seen_names:
                    seen_names.add(candidate)
                    break
            else:
                continue

            prompt = f"""You are a creative football club name assistant.

Rules:
- Generate ONE unique and realistic football club name.
- The name must not be a real club, but should sound plausible for a club from {country}.
- Only return the name in double quotes.

Examples:
{few_shot_block}

Your turn:
\""""

            record = {
                "instruction": prompt,
                "response": candidate
            }

            out.write(json.dumps(record, ensure_ascii=False) + "\n")

print(f"Wrote {out_path} with {len(seen_names):,} unique club names.")