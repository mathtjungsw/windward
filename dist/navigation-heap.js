export class Heap{
  data=[];
  push(id,score){let i=this.data.length;this.data.push([id,score]);while(i){const p=(i-1)>>1;if(this.data[p][1]<=score)break;this.data[i]=this.data[p];i=p;}this.data[i]=[id,score];}
  pop(){const top=this.data[0],last=this.data.pop();if(this.data.length){let i=0;while(i*2+1<this.data.length){let c=i*2+1;if(c+1<this.data.length&&this.data[c+1][1]<this.data[c][1])c++;if(this.data[c][1]>=last[1])break;this.data[i]=this.data[c];i=c;}this.data[i]=last;}return top[0];}
  get size(){return this.data.length;}
}
