#!/usr/bin/env python3
"""
Token World - CSV Data Sanitizer & Validator
System: Token World
Sole Owner: Mauro Lomibao Dar III
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024 | (310) 904-5646

Handles malformed inputs (such as corrupted hex addresses 0xc0rp... and incomplete rows)
before submitting payload data to Token World testnet or contract functions.
"""

import csv
import re
import sys

def is_valid_address(address: str) -> bool:
    """Validates EVM 20-byte hex address format."""
    return bool(re.match(r"^0x[a-fA-F0-9]{40}$", address.strip()))

def sanitize_csv(input_filepath: str, output_filepath: str):
    valid_records = []
    rejected_records = []

    with open(input_filepath, mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        for row_num, row in enumerate(reader, start=2):
            address = row.get("address", "").strip()
            amount = row.get("amount", "").strip()

            if not address or not amount:
                rejected_records.append((row_num, row, "Incomplete record"))
                continue

            if not is_valid_address(address):
                rejected_records.append((row_num, row, f"Malformed address: {address}"))
                continue

            try:
                valid_amount = int(amount)
                valid_records.append({"address": address, "amount": valid_amount})
            except ValueError:
                rejected_records.append((row_num, row, f"Invalid numeric amount: {amount}"))

    with open(output_filepath, mode='w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=["address", "amount"])
        writer.writeheader()
        writer.writerows(valid_records)

    print(f"[Token World] Ingestion complete. Valid records saved: {len(valid_records)}. Rejected: {len(rejected_records)}.")
    return len(valid_records), len(rejected_records)

if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "token_input.csv"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "token_sanitized.csv"
    sanitize_csv(input_file, output_file)
