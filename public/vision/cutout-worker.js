let segmenter;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      const {ImageSegmenter,FilesetResolver} = await import('/vision/vision_bundle.mjs');
      const files = await FilesetResolver.forVisionTasks('/vision/wasm');
      segmenter = await ImageSegmenter.createFromOptions(files, {
        baseOptions:{modelAssetPath:'/vision/selfie_segmenter.tflite',delegate:'CPU'},
        runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false,
      });
      self.postMessage({id:data.id,ready:true});
    } else {
      try {
        segmenter.segment(data.image, result => {
          const masks=result.confidenceMasks,mask=masks?.length===1?masks[0]:masks?.[1];
          if(!mask)throw new Error('No person mask returned');
          const pixels=new Float32Array(mask.getAsFloat32Array());
          self.postMessage({id:data.id,width:mask.width,height:mask.height,pixels},[pixels.buffer]);
        });
      } finally {data.image.close();}
    }
  } catch(error) {self.postMessage({id:data.id,error:String(error)});}
};
