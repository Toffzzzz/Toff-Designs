def load(path):
    raw=open(path).read().split('\n')
    # join continuation lines: each glyph record starts with 5-char num; lines may be wrapped at 72 chars
    recs=[];cur=''
    for line in raw:
        if not line: continue
        if cur and len(cur)>=8:
            n=int(cur[5:8]); need=8+2*n
            if len(cur)<need: cur+=line; continue
            recs.append(cur); cur=line
        else: cur+=line
    if cur: recs.append(cur)
    glyphs={}
    for i,r in enumerate(recs):
        n=int(r[5:8]); body=r[8:8+2*n]
        L=ord(body[0])-82; R=ord(body[1])-82
        strokes=[[]]
        for j in range(2,len(body),2):
            a,b=body[j],body[j+1]
            if a==' ' and b=='R': strokes.append([]); continue
            strokes[-1].append((ord(a)-82,ord(b)-82))
        glyphs[chr(32+i)]=(L,R,[s for s in strokes if s])
    return glyphs
