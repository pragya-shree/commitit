import sys
sys.path.append("backend")
from pathlib import Path
import tempfile
from app.services import knowledge_service, impact_analysis_service
from app.services.repository_store import register

tmp = Path(tempfile.mkdtemp())
(tmp / "core").mkdir()
(tmp / "services").mkdir()
(tmp / "core" / "config.py").write_text("class Config:\n    ENV = 'prod'\n")
(tmp / "services" / "db_service.py").write_text("from core.config import Config\nclass DBService:\n    pass\n")

rid = register(tmp)
model = knowledge_service.build(rid, tmp)

graph = impact_analysis_service._get_graph_index(model)
print("ALL FILES:", graph.all_files)
print("FILE TO SYMBOLS:", graph.file_to_symbols)
print("SYMBOL TO FILE:", graph.symbol_to_file)
print("REVERSE ADJ:", graph.reverse_adj)
res = impact_analysis_service.analyze_impact(model, "core/config.py")
print("METRICS:", res.metrics)
print("AFFECTED FILES:", res.affected_files)
