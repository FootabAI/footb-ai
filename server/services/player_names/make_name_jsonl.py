import pandas as pd, random, json, pathlib, tqdm

# Load & group players by nationality
df = pd.read_csv("data/fifa_players.csv")
by_nat = df.groupby("nationality")["full_name"].apply(list)

out_path = pathlib.Path("name_tune_1name.jsonl")
seen_names = set()

with out_path.open("w", encoding="utf-8") as out:
    for nat, names in tqdm.tqdm(by_nat.items(), desc="nationalities"):
        # Keep only names with both first and last name
        names = [n for n in names if " " in n]
        if len(names) < 10:
            continue

        reps = 200 if len(names) > 120 else 400
        for _ in range(reps):
            # Sample 10 real examples for few-shot context
            k = min(10, len(names))
            few_shot = random.sample(names, k)

            # Build few-shot string like: "Rhys Downing"\n"Finley Braithwaite"
            few_shot_block = "\n".join(f'"{n}"' for n in few_shot)

            # Generate a synthetic target name
            firsts = [n.split()[0] for n in few_shot]
            lasts = [n.split()[-1] for n in few_shot]

            for _ in range(5):  # up to 5 retries to get a unique name
                candidate = f"{random.choice(firsts)} {random.choice(lasts)}"
                if candidate not in few_shot and candidate not in seen_names:
                    seen_names.add(candidate)
                    break
            else:
                continue  # skip if we couldn't generate a unique one

            prompt = f"""You are a creative football name assistant.

Rules:
- Generate ONE unique and realistic footballer name.
- The name must sound plausible for a footballer from {nat}.
- Only return the name in double quotes.

Examples:
{few_shot_block}

Your turn:
\""""

            # Final record
            record = {
                "instruction": prompt,
                "response": candidate
            }

            out.write(json.dumps(record, ensure_ascii=False) + "\n")

print(f"Wrote {out_path} with {len(seen_names):,} unique 1-name examples.")