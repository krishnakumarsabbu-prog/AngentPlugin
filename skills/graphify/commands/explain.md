# /graphify-explain

Explains a node or concept in the graph in plain language.

## Invocation

```
graphify explain "SwinTransformer"        # Explain a specific node
graphify explain "AuthModule" --depth 2   # Explain with 2 levels of neighbors
```

## Process

1. Check that `graphify-out/graph.json` exists.
2. Find the node by label (fuzzy match if exact match fails).
3. Gather the node's properties, its edges (incoming and outgoing), and its community.
4. Produce a plain-language explanation:
   - What the node is (type, source file, line).
   - What it depends on (outgoing edges).
   - What depends on it (incoming edges).
   - Which community it belongs to.
   - Its role in the architecture (inferred from connections).

## Output

```
# SwinTransformer

**Type:** Class
**Source:** src/models/swin.py:45
**Community:** Attention Mechanism (Community 2)

## What it is
A Transformer-based architecture that uses shifted windows for efficient attention computation.

## What it depends on (outgoing edges)
- [IMPORTS] torch.nn (external library)
- [CALLS] WindowAttention (src/models/attention.py:12)
- [EXTENDS] nn.Module (base class)

## What depends on it (incoming edges)
- [IMPORTS] SwinTransformerModel (src/model_factory.py:28)
- [CALLS] train_swin() (src/train.py:56)

## Role in architecture
This is a core model class in the Attention Mechanism community. It is consumed by the
model factory and training pipeline. It depends on the WindowAttention class for its
core attention computation.
```

## Rules

- Explain in plain language, not just a data dump.
- Distinguish EXTRACTED relationships (from AST) from INFERRED ones (from analysis).
- If the node is not found, say so and suggest similar node labels.
- Always cite the source file and line.
