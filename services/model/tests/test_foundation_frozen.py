from __future__ import annotations

import ast
import dataclasses
import enum
import importlib
import inspect
import subprocess
import sys
from pathlib import Path

FOUNDATION = ("provenance", "thermo", "geometry", "params", "state", "ledger")
SOURCE = Path(__file__).resolve().parents[1] / "src" / "hydrocycle"
SURFACE_FILE = Path(__file__).resolve().parent / "data" / "foundation_surface.txt"


def test_foundation_imports_only_stdlib_and_foundation() -> None:
    for name in FOUNDATION:
        tree = ast.parse((SOURCE / f"{name}.py").read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    top = alias.name.split(".")[0]
                    assert top in sys.stdlib_module_names, f"{name} imports {alias.name}"
            elif isinstance(node, ast.ImportFrom):
                if node.level == 0:
                    top = (node.module or "").split(".")[0]
                    assert top in sys.stdlib_module_names or top == "__future__", (
                        f"{name} imports {node.module}"
                    )
                else:
                    targets = [node.module] if node.module else [a.name for a in node.names]
                    for target in targets:
                        assert target in FOUNDATION, f"{name} imports .{target}"


def _imported_names(name: str) -> set[str]:
    tree = ast.parse((SOURCE / f"{name}.py").read_text())
    return {
        (alias.asname or alias.name).split(".")[0]
        for node in ast.walk(tree)
        if isinstance(node, (ast.Import, ast.ImportFrom))
        for alias in node.names
    }


def _field_text(f: dataclasses.Field[object]) -> str:
    text = f"{f.name}: {f.type}"
    if f.default is not dataclasses.MISSING:
        text += f" = {f.default!r}"
    elif f.default_factory is not dataclasses.MISSING:
        text += f" = factory {getattr(f.default_factory, '__name__', repr(f.default_factory))}"
    return text


def _render_class(name: str, attr: str, obj: type) -> list[str]:
    lines: list[str] = []
    field_names: set[str] = set()
    if dataclasses.is_dataclass(obj):
        field_names = {f.name for f in dataclasses.fields(obj)}
        fields = ", ".join(_field_text(f) for f in dataclasses.fields(obj))
        lines.append(f"{name}.{attr}({fields})")
    else:
        lines.append(f"{name}.{attr} class")
    is_enum = issubclass(obj, enum.Enum)
    if is_enum:
        for enum_member in obj:
            lines.append(f"{name}.{attr}.{enum_member.name} = {enum_member.value!r}")
    for member in sorted(vars(obj)):
        if member.startswith("_") or member in field_names:
            continue
        value = inspect.getattr_static(obj, member)
        if is_enum and isinstance(value, obj):
            continue
        if isinstance(value, (staticmethod, classmethod)):
            value = value.__func__
        if inspect.isfunction(value):
            lines.append(f"{name}.{attr}.{member}{inspect.signature(value)}")
        elif isinstance(value, property):
            lines.append(f"{name}.{attr}.{member} property")
        else:
            raise AssertionError(f"unrendered public member {name}.{attr}.{member}")
    return lines


def render_surface() -> str:
    from hydrocycle.params import ParameterSet
    from hydrocycle.provenance import HazardTBD

    lines: list[str] = []
    for name in FOUNDATION:
        module = importlib.import_module(f"hydrocycle.{name}")
        imported = _imported_names(name)
        for attr in sorted(vars(module)):
            if attr.startswith("_") or attr in imported:
                continue
            obj = getattr(module, attr)
            if inspect.isclass(obj):
                lines.extend(_render_class(name, attr, obj))
            elif inspect.isfunction(obj):
                lines.append(f"{name}.{attr}{inspect.signature(obj)}")
            elif isinstance(obj, ParameterSet):
                lines.append(f"{name}.{attr} = ParameterSet fingerprint {obj.fingerprint()}")
            elif isinstance(obj, (HazardTBD, str, bool, int, float, tuple)):
                lines.append(f"{name}.{attr} = {obj!r}")
            elif isinstance(obj, dict):
                lines.append(f"{name}.{attr} = {sorted(obj.items())!r}")
            else:
                raise AssertionError(f"unrendered public name {name}.{attr}")
    return "\n".join(lines) + "\n"


def test_foundation_surface_is_frozen() -> None:
    expected = SURFACE_FILE.read_text()
    actual = render_surface()
    assert actual == expected, (
        "The P1 foundation's public surface changed. The model spec forbids editing the "
        "foundation; if the change is deliberate, regenerate tests/data/foundation_surface.txt "
        'with `uv run --frozen python -c "import tests.test_foundation_frozen as t; '
        "open('tests/data/foundation_surface.txt','w').write(t.render_surface())\"` "
        "from services/model and commit it with the change."
    )


def test_foundation_loads_without_heavy_modules() -> None:
    """Load the six modules without running hydrocycle/__init__ (which imports numpy)."""
    code = f"""
import importlib.util, sys, types
pkg = types.ModuleType("hydrocycle")
pkg.__path__ = [{str(SOURCE)!r}]
sys.modules["hydrocycle"] = pkg
for n in {list(FOUNDATION)!r}:
    importlib.import_module("hydrocycle." + n)
banned = ("numpy", "scipy", "pydantic", "cantera", "hydrocycle.schemas", "hydrocycle.physics")
bad = sorted(m for m in sys.modules if m in banned or m.split(".")[0] in banned[:4])
assert not bad, bad
assert all("hydrocycle." + n in sys.modules for n in {list(FOUNDATION)!r})
print("CLEAN")
"""
    result = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, check=False, timeout=60
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "CLEAN" in result.stdout, result.stdout
