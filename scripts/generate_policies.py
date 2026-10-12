"""Build bilingual fictional PDF fixtures and extract their text for the teaching demo.
Run in an environment with reportlab and pypdf installed.
"""
import json, hashlib
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
policies=json.loads((ROOT/'src/data/policies/catalog.json').read_text())
chunks=[]
for policy in policies:
 for lang in ('en','es'):
  path=ROOT/'public/policies'/f"{policy['id']}-{lang}.pdf"
  c=canvas.Canvas(str(path),pagesize=(595,842),invariant=1)
  c.setTitle(f"Luma Store - {policy['title'][lang]} {policy['version']}")
  c.setAuthor('Luma Store - fictional teaching fixture')
  c.setFillColor(HexColor('#080d24'));c.rect(0,0,595,842,fill=1,stroke=0)
  def text(x,y,value,size=11,color='#e8efff',font='Helvetica'):
   c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,y,value)
  text(44,791,'LUMA STORE / POLICY LIBRARY',11,'#64e9f0','Helvetica-Bold')
  text(44,746,policy['title'][lang],26,font='Helvetica-Bold')
  text(44,718,f"{policy['id']} / {lang.upper()} / {policy['market']}",12,'#b4c1da')
  disclaimer='FICTIONAL STORE - TEACHING EXAMPLE ONLY' if lang=='en' else 'TIENDA FICTICIA - SOLO EJEMPLO EDUCATIVO'
  text(44,683,disclaimer,10,'#64e9f0','Helvetica-Bold')
  end=policy['effective_to'] or ('open-ended' if lang=='en' else 'sin fin definido')
  lines=[f"Effective / Vigencia: [{policy['effective_from']}, {end})",f"Date basis / Fecha base: {policy['date_basis']}",f"Uploaded / Carga: {policy['uploaded_at']}  |  Status / Estado: READY"]
  for i,line in enumerate(lines):text(44,648-i*21,line,10,'#b4c1da')
  style=ParagraphStyle('body',fontName='Helvetica',fontSize=12,leading=19,textColor=HexColor('#e8efff'))
  y=554
  for i,section in enumerate(policy['sections'][lang],1):
   paragraph=Paragraph(f'<b>{i}.</b> {section}',style)
   w,h=paragraph.wrap(507,600)
   if y-h<85:raise ValueError(f"Overflow: {path}")
   paragraph.drawOn(c,44,y-h);y-=h+28
  text(44,49,'System Design / RAG / Augusto Gonzalez',9,'#93a5c7')
  text(520,49,'1 / 1',9,'#93a5c7');c.save()
  extracted=PdfReader(path).pages[0].extract_text()
  for section in policy['sections'][lang]:
   if ' '.join(section.split()) not in ' '.join(extracted.split()):raise ValueError(f'Missing PDF text: {path}')
  chunks.append({'id':policy['id'],'language':lang,'page':1,'source':f'/policies/{path.name}', 'checksum':hashlib.sha256(path.read_bytes()).hexdigest(),'text':extracted,'passage':policy['sections'][lang][1]})
(ROOT/'src/data/policies/chunks.json').write_text(json.dumps(chunks,ensure_ascii=False,indent=2)+'\n')
print(f'Generated and extracted {len(chunks)} PDF fixtures.')
