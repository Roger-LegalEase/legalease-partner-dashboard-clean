#!/usr/bin/env node
import { runFamilyById } from "./build-census-v1-ne-setaside-custodial-set.mjs";
await runFamilyById("ne-setaside-noncustodial-set");
